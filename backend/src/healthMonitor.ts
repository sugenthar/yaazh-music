import { providerManager } from "./modules/music/providerManager";
import { metrics } from "./services/metrics";

let interval: ReturnType<typeof setInterval> | null = null;

/**
 * Periodically probes provider health so circuit breaker state and readiness
 * stay reasonably fresh without blocking requests.
 */
export const setupHealthChecks = (): void => {
  if (interval) return;
  interval = setInterval(async () => {
    try {
      const started = Date.now();
      const statuses = await providerManager.health();
      for (const s of statuses) {
        metrics.recordProviderCall(`health:${s.name}`, Date.now() - started);
      }
    } catch {
      // health checks must never crash the server
    }
  }, 60_000);
  if (interval.unref) interval.unref();
};

export const stopHealthChecks = (): void => {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
};

export const getHealthCheckState = (): { running: boolean } => ({
  running: interval !== null,
});
