import env from "./config/env";
import { logger } from "./utils/logger";
import { cacheService } from "./services/cache";
import { closeDb } from "./config/database";
import { providerManager } from "./modules/music/providerManager";
import { closeRedis } from "./config/redis";
import { workerManager } from "./workers";

let ready = true;

/**
 * Called when the instance begins shutting down so the load balancer stops
 * routing new traffic to this instance via the /ready health check.
 */
export const setNotReady = (): void => {
  ready = false;
};

export const isReady = (): boolean => ready;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ShutdownOptions {
  /** HTTP server close callback that resolves once `server.close()` finishes. */
  closeHttpServer: () => Promise<void>;
  signal: string;
}

/**
 * Drains the instance for load-balancer-aware graceful shutdown.
 * Order: mark not-ready -> stop accepting -> drain HTTP -> stop workers ->
 * close provider resources -> close cache/redis -> close db -> exit.
 */
export const shutdown = (options: ShutdownOptions): void => {
  const { closeHttpServer, signal } = options;
  let shuttingDown = false;

  return void (async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    setNotReady();
    logger.info("server.shutdown.initiated", { signal, instanceId: env.instanceId });

    const forceExitTimer = setTimeout(() => {
      logger.error("server.shutdown.timeout", {
        message: "Forced exit after timeout",
      });
      process.exit(1);
    }, env.shutdownTimeoutMs);
    forceExitTimer.unref();

    try {
      // 1. Stop accepting new requests (drain in-flight over timeout)
      await Promise.race([closeHttpServer(), sleep(env.shutdownTimeoutMs)]);

      // 2. Stop background workers and drain queued jobs
      await Promise.race([workerManager.drain(), sleep(5000)]);

      // 3. Close provider resources
      providerManager.reset();

      // 4. Clear + close cache and Redis
      await cacheService.clear();
      await closeRedis();

      // 5. Close database
      closeDb();

      logger.info("server.shutdown.complete", { instanceId: env.instanceId });
      process.exit(0);
    } catch (err) {
      logger.error("server.shutdown.failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
      process.exit(1);
    }
  })();
};
