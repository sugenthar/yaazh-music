// Load testing harness for the Yaazh Music backend.
//
// Targets a running instance (start with `npm run dev` or `npm start`, or point
// at a load-balanced set behind a reverse proxy via BASE_URL). It measures
// throughput and latency across a range of concurrent clients, mirroring the
// 10 -> 500 concurrency ramp described in the scalability work.
//
// Usage:
//   node tests/load/loadTest.mjs
//   BASE_URL=http://localhost:3000 CONCURRENCY=200 DURATION_MS=10000 node tests/load/loadTest.mjs
//
// No external dependencies: uses only Node's built-in http and fetch.

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENCY = Number(process.env.CONCURRENCY || 100);
const DURATION_MS = Number(process.env.DURATION_MS || 5000);
const PATH = process.env.LOAD_PATH || "/health";

import http from "node:http";

const url = new URL(PATH, BASE_URL);

// Register with OPTIONS to warm any provider circuit breakers is unnecessary;
// /health and /api/metrics are lightweight. For music endpoints, the providers
// will be exercised naturally.

const runWorker = async (results, active, durationMs) => {
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline && active.count > 0) {
    const start = performance.now();
    const status = await new Promise((resolve, reject) => {
      const req = http.request(url, { method: "GET" }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, bytes: body.length, latency: performance.now() - start }));
      });
      req.on("error", reject);
      req.setTimeout(10_000, () => req.destroy(new Error("timeout")));
      req.end();
    }).catch(() => ({ status: 0, bytes: 0, latency: performance.now() - start }));
    results.push(status);
  }
  active.count -= 1;
};

const run = async (concurrency, durationMs, path) => {
  const results = [];
  const active = { count: concurrency };
  const workers = Array.from({ length: concurrency }, () => runWorker(results, active, durationMs));
  await Promise.all(workers);

  const total = results.length;
  const ok = results.filter((r) => r.status >= 200 && r.status < 300).length;
  const errors = results.filter((r) => r.status === 0).length;
  const sorted = results.map((r) => r.latency).sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.min(total - 1, Math.floor(total * p))] || 0;

  return {
    concurrency,
    requests: total,
    rps: Math.round(total / (durationMs / 1000)),
    successRate: total ? Math.round((ok / total) * 1000) / 10 : 0,
    errors,
    p50Ms: Math.round(percentile(0.5) * 10) / 10,
    p95Ms: Math.round(percentile(0.95) * 10) / 10,
    p99Ms: Math.round(percentile(0.99) * 10) / 10,
    maxMs: Math.round(percentile(1) * 10) / 10,
  };
};

const levels = process.env.LOAD_RAMP
  ? process.env.LOAD_RAMP.split(",").map(Number)
  : [10, 50, 100, 200, 500];

console.log(`Target: ${BASE_URL}${PATH}`);
console.log(`Ramp (concurrency levels): ${levels.join(", ")}  duration: ${DURATION_MS}ms\n`);
console.log("concurrency | requests | rps     | success% | p50   | p95   | p99   | max");

for (const concurrency of levels) {
  const actualMs = DURATION_MS; // keep duration per level for comparability
  const r = await run(concurrency, actualMs, PATH);
  console.log(
    `${String(concurrency).padEnd(11)} | ${String(r.requests).padEnd(9)} | ` +
      `${String(r.rps).padEnd(7)} | ${String(r.successRate).padEnd(9)} | ` +
      `${String(r.p50Ms).padEnd(5)} | ${String(r.p95Ms).padEnd(5)} | ` +
      `${String(r.p99Ms).padEnd(5)} | ${r.maxMs}`
  );
  // small cooldown between levels to let the DB/connections settle
  await new Promise((r) => setTimeout(r, 500));
}

console.log("\nDone.");
