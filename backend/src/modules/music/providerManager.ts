import { logger } from "../../utils/logger";
import { CircuitBreaker } from "../../utils/circuitBreaker";
import env from "../../config/env";
import { YaazhSong, MusicSearchResult } from "./music.types";
import { MusicProvider, ProviderSearchResult, ProviderHealth } from "./providers/music-provider.interface";

export interface ProviderStatus {
  name: string;
  priority: number;
  circuitState: string;
  isAvailable: boolean;
  stats: {
    successes: number;
    failures: number;
    timeouts: number;
    consecutiveFailures: number;
    lastSuccess: number | null;
    lastFailure: number | null;
    totalRequests: number;
  };
}

export class ProviderManager {
  private providers: MusicProvider[] = [];
  private breakers = new Map<string, CircuitBreaker>();

  register(provider: MusicProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
    this.breakers.set(
      provider.name,
      new CircuitBreaker({
        failureThreshold: env.providerFailureThreshold,
        cooldownMs: env.providerCooldownMs,
        halfOpenRequests: 1,
      })
    );
  }

  getProvider(name: string): MusicProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  private getAvailableProviders(): MusicProvider[] {
    return this.providers.filter((p) => {
      const breaker = this.breakers.get(p.name);
      if (breaker && !breaker.isAvailable()) return false;
      if (!p.isAvailable()) return false;
      return true;
    });
  }

  async search(
    query: string,
    page: number,
    limit: number
  ): Promise<MusicSearchResult> {
    const available = this.getAvailableProviders();
    if (available.length === 0) {
      logger.warn("provider_manager.no_providers_available", { query, page, limit });
      return this.tryFallbackSearch(query, page, limit);
    }

    let lastError: Error | null = null;
    for (const provider of available) {
      const breaker = this.breakers.get(provider.name)!;
      try {
        const started = Date.now();
        const result = await provider.search(query, page, limit);
        const latencyMs = Date.now() - started;
        breaker.recordSuccess();
        if (env.nodeEnv !== "test") {
          logger.info("provider_manager.search.success", {
            provider: provider.name,
            query,
            page,
            limit,
            results: result.songs.length,
            latencyMs,
          });
        }
        return {
          query,
          page,
          limit,
          songs: result.songs,
          hasNextPage: result.hasNextPage,
        };
      } catch (err) {
        const isTimeout =
          err instanceof Error &&
          (err.name === "AbortError" || err.message.includes("timeout"));
        breaker.recordFailure(isTimeout);
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn("provider_manager.search.fail", {
          provider: provider.name,
          query,
          error: lastError.message,
          circuitState: breaker.getState(),
        });
      }
    }

    return this.tryFallbackSearch(query, page, limit);
  }

  private async tryFallbackSearch(
    query: string,
    page: number,
    limit: number
  ): Promise<MusicSearchResult> {
    const allProviders = this.providers;
    for (const provider of allProviders) {
      if (!provider.isAvailable()) continue;
      try {
        const started = Date.now();
        const result = await provider.search(query, page, limit);
        const latencyMs = Date.now() - started;
        logger.info("provider_manager.fallback.success", {
          provider: provider.name,
          query,
          results: result.songs.length,
          latencyMs,
        });
        return {
          query,
          page,
          limit,
          songs: result.songs,
          hasNextPage: result.hasNextPage,
        };
      } catch {
        continue;
      }
    }
    return {
      query,
      page,
      limit,
      songs: [],
      hasNextPage: false,
    };
  }

  async getById(songId: string): Promise<YaazhSong | null> {
    const available = this.getAvailableProviders();
    for (const provider of available) {
      try {
        const song = await provider.getById(songId);
        if (song) {
          const breaker = this.breakers.get(provider.name);
          breaker?.recordSuccess();
          return song;
        }
      } catch {
        const breaker = this.breakers.get(provider.name);
        breaker?.recordFailure(false);
      }
    }

    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      try {
        const song = await provider.getById(songId);
        if (song) return song;
      } catch {
        continue;
      }
    }
    return null;
  }

  async health(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];
    for (const provider of this.providers) {
      const breaker = this.breakers.get(provider.name);
      const stats = breaker?.getStats() ?? {
        successes: 0,
        failures: 0,
        timeouts: 0,
        consecutiveFailures: 0,
        lastSuccess: null,
        lastFailure: null,
        totalRequests: 0,
      };
      statuses.push({
        name: provider.name,
        priority: provider.priority,
        circuitState: breaker?.getState() ?? "closed",
        isAvailable: provider.isAvailable(),
        stats,
      });
    }
    return statuses;
  }

  reset(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

export const providerManager = new ProviderManager();
