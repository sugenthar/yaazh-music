interface RouteStats {
  count: number;
  totalLatencyMs: number;
  statusCodes: Record<string, number>;
}

interface MetricsSnapshot {
  totalRequests: number;
  routes: Record<string, RouteStats>;
  statusDistribution: Record<string, number>;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  providerFailures: number;
  providerFallbacks: number;
  providerLatency: Record<string, number>;
  providerCalls: Record<string, number>;
  cacheHits: number;
  cacheMisses: number;
  cacheErrors: number;
  databaseErrors: number;
  authenticationFailures: number;
  rateLimitRejections: number;
  since: string;
}

class MetricsCollector {
  private totalRequests = 0;
  private routes: Record<string, RouteStats> = {};
  private statusDistribution: Record<string, number> = {};
  private latencies: number[] = [];
  private providerFailures = 0;
  private providerFallbacks = 0;
  private providerLatency: Record<string, number> = {};
  private providerCalls: Record<string, number> = {};
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheErrors = 0;
  private databaseErrors = 0;
  private authenticationFailures = 0;
  private rateLimitRejections = 0;
  private readonly since = new Date().toISOString();
  private readonly maxLatencySamples = 5000;

  recordRequest(route: string, statusCode: number, latencyMs: number): void {
    this.totalRequests++;
    const routeKey = route || "unknown";
    if (!this.routes[routeKey]) {
      this.routes[routeKey] = { count: 0, totalLatencyMs: 0, statusCodes: {} };
    }
    this.routes[routeKey].count++;
    this.routes[routeKey].totalLatencyMs += latencyMs;
    const statusKey = String(statusCode);
    this.routes[routeKey].statusCodes[statusKey] =
      (this.routes[routeKey].statusCodes[statusKey] || 0) + 1;

    this.statusDistribution[statusKey] = (this.statusDistribution[statusKey] || 0) + 1;

    if (this.latencies.length < this.maxLatencySamples) {
      this.latencies.push(latencyMs);
    }
  }

  recordProviderFailure(): void {
    this.providerFailures++;
  }

  recordProviderFallback(): void {
    this.providerFallbacks++;
  }

  recordProviderCall(provider: string, latencyMs: number): void {
    this.providerCalls[provider] = (this.providerCalls[provider] || 0) + 1;
    const prev = this.providerLatency[provider] || 0;
    const count = this.providerCalls[provider];
    this.providerLatency[provider] = count > 1 ? (prev + latencyMs) / 2 : latencyMs;
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  recordCacheError(): void {
    this.cacheErrors++;
  }

  recordDatabaseError(): void {
    this.databaseErrors++;
  }

  recordAuthenticationFailure(): void {
    this.authenticationFailures++;
  }

  recordRateLimitRejection(): void {
    this.rateLimitRejections++;
  }

  getSnapshot(): MetricsSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const total = this.latencies.length;
    const p50 = total > 0 ? sorted[Math.floor(total * 0.5)] || 0 : 0;
    const p95 = total > 0 ? sorted[Math.floor(total * 0.95)] || 0 : 0;

    let totalLatency = 0;
    let totalCount = 0;
    for (const route of Object.values(this.routes)) {
      totalLatency += route.totalLatencyMs;
      totalCount += route.count;
    }

    return {
      totalRequests: this.totalRequests,
      routes: this.routes,
      statusDistribution: this.statusDistribution,
      averageLatencyMs: totalCount > 0 ? Math.round(totalLatency / totalCount) : 0,
      p50LatencyMs: Math.round(p50),
      p95LatencyMs: Math.round(p95),
      providerFailures: this.providerFailures,
      providerFallbacks: this.providerFallbacks,
      providerLatency: this.providerLatency,
      providerCalls: this.providerCalls,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheErrors: this.cacheErrors,
      databaseErrors: this.databaseErrors,
      authenticationFailures: this.authenticationFailures,
      rateLimitRejections: this.rateLimitRejections,
      since: this.since,
    };
  }

  getProviderStats(provider: string): {
    failures: number;
    fallbacks: number;
    calls: number;
    averageLatencyMs: number;
  } {
    return {
      failures: this.providerFailures,
      fallbacks: this.providerFallbacks,
      calls: this.providerCalls[provider] || 0,
      averageLatencyMs: Math.round(this.providerLatency[provider] || 0),
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.routes = {};
    this.statusDistribution = {};
    this.latencies = [];
    this.providerFailures = 0;
    this.providerFallbacks = 0;
    this.providerLatency = {};
    this.providerCalls = {};
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheErrors = 0;
    this.databaseErrors = 0;
    this.authenticationFailures = 0;
    this.rateLimitRejections = 0;
  }
}

export const metrics = new MetricsCollector();
