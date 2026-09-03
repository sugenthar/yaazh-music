import env from "../config/env";

interface RouteStats {
  count: number;
  totalLatencyMs: number;
  statusCodes: Record<string, number>;
}

interface MetricsSnapshot {
  instanceId: string;
  totalRequests: number;
  routes: Record<string, RouteStats>;
  statusDistribution: Record<string, number>;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  providerFailures: number;
  providerFallbacks: number;
  providerLatency: Record<string, number>;
  providerCalls: Record<string, number>;
  cacheHits: number;
  cacheMisses: number;
  cacheErrors: number;
  cacheSharedHits: number;
  cacheSharedMisses: number;
  cacheSharedErrors: number;
  databaseErrors: number;
  databaseLatencyMs: number;
  authenticationFailures: number;
  rateLimitRejections: number;
  redisLatencyMs: number;
  workerJobs: number;
  workerSuccesses: number;
  workerFailures: number;
  workerRetries: number;
  backupFiles: number;
  backupBytes: number;
  backupRestores: number;
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
  private cacheSharedHits = 0;
  private cacheSharedMisses = 0;
  private cacheSharedErrors = 0;
  private databaseErrors = 0;
  private databaseLatencyMs = 0;
  private databaseLatencyCount = 0;
  private authenticationFailures = 0;
  private rateLimitRejections = 0;
  private redisLatencyMs = 0;
  private redisLatencyCount = 0;
  private workerJobs = 0;
  private workerSuccesses = 0;
  private workerFailures = 0;
  private workerRetries = 0;
  private backupFiles = 0;
  private backupBytes = 0;
  private backupRestores = 0;
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

  recordCacheSharedHit(): void {
    this.cacheSharedHits++;
  }

  recordCacheSharedMiss(): void {
    this.cacheSharedMisses++;
  }

  recordCacheSharedError(): void {
    this.cacheSharedErrors++;
  }

  recordDatabaseError(): void {
    this.databaseErrors++;
  }

  recordDatabaseLatency(latencyMs: number): void {
    this.databaseLatencyMs += latencyMs;
    this.databaseLatencyCount++;
  }

  recordRedisLatency(latencyMs: number): void {
    this.redisLatencyMs += latencyMs;
    this.redisLatencyCount++;
  }

  recordAuthenticationFailure(): void {
    this.authenticationFailures++;
  }

  recordRateLimitRejection(): void {
    this.rateLimitRejections++;
  }

  recordWorkerJob(): void {
    this.workerJobs++;
  }

  recordWorkerSuccess(): void {
    this.workerSuccesses++;
  }

  recordWorkerFailure(): void {
    this.workerFailures++;
  }

  recordWorkerRetry(): void {
    this.workerRetries++;
  }

  recordBackupCreated(sizeBytes: number): void {
    this.backupFiles++;
    this.backupBytes += sizeBytes;
  }

  recordBackupRestored(rowCount: number): void {
    this.backupRestores++;
    void rowCount;
  }

  getSnapshot(): MetricsSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const total = this.latencies.length;
    const p50 = total > 0 ? sorted[Math.floor(total * 0.5)] || 0 : 0;
    const p95 = total > 0 ? sorted[Math.floor(total * 0.95)] || 0 : 0;
    const p99 = total > 0 ? sorted[Math.floor(total * 0.99)] || 0 : 0;

    let totalLatency = 0;
    let totalCount = 0;
    for (const route of Object.values(this.routes)) {
      totalLatency += route.totalLatencyMs;
      totalCount += route.count;
    }

    return {
      instanceId: env.instanceId,
      totalRequests: this.totalRequests,
      routes: this.routes,
      statusDistribution: this.statusDistribution,
      averageLatencyMs: totalCount > 0 ? Math.round(totalLatency / totalCount) : 0,
      p50LatencyMs: Math.round(p50),
      p95LatencyMs: Math.round(p95),
      p99LatencyMs: Math.round(p99),
      providerFailures: this.providerFailures,
      providerFallbacks: this.providerFallbacks,
      providerLatency: this.providerLatency,
      providerCalls: this.providerCalls,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheErrors: this.cacheErrors,
      cacheSharedHits: this.cacheSharedHits,
      cacheSharedMisses: this.cacheSharedMisses,
      cacheSharedErrors: this.cacheSharedErrors,
      databaseErrors: this.databaseErrors,
      databaseLatencyMs: this.databaseLatencyCount > 0 ? Math.round(this.databaseLatencyMs / this.databaseLatencyCount) : 0,
      authenticationFailures: this.authenticationFailures,
      rateLimitRejections: this.rateLimitRejections,
      redisLatencyMs: this.redisLatencyCount > 0 ? Math.round(this.redisLatencyMs / this.redisLatencyCount) : 0,
      workerJobs: this.workerJobs,
      workerSuccesses: this.workerSuccesses,
      workerFailures: this.workerFailures,
      workerRetries: this.workerRetries,
      backupFiles: this.backupFiles,
      backupBytes: this.backupBytes,
      backupRestores: this.backupRestores,
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
    this.cacheSharedHits = 0;
    this.cacheSharedMisses = 0;
    this.cacheSharedErrors = 0;
    this.databaseErrors = 0;
    this.databaseLatencyMs = 0;
    this.databaseLatencyCount = 0;
    this.authenticationFailures = 0;
    this.rateLimitRejections = 0;
    this.redisLatencyMs = 0;
    this.redisLatencyCount = 0;
    this.workerJobs = 0;
    this.workerSuccesses = 0;
    this.workerFailures = 0;
    this.workerRetries = 0;
    this.backupFiles = 0;
    this.backupBytes = 0;
    this.backupRestores = 0;
  }
}

export const metrics = new MetricsCollector();
