/**
 * Utilities to build a database connection URL with safe pooling defaults.
 *
 * Why: Prisma's default pool size is `num_physical_cpus * 2 + 1` PER app
 * instance, with no upper bound configured in the connection string. Under
 * high traffic with several instances (or serverless scaling), the sum of
 * all pools exceeds the database server's `max_connections`, causing
 * "Too many connections" errors and pool-timeout (P2024) failures — the
 * root cause of the recent outage.
 *
 * These helpers append explicit `connection_limit` and `pool_timeout`
 * parameters to the DATABASE_URL so each instance's footprint is bounded and
 * predictable. Values are configurable via environment variables:
 *
 *   DB_CONNECTION_LIMIT  max pooled connections per instance (default: 10)
 *   DB_POOL_TIMEOUT      seconds to wait for a free connection (default: 10)
 *   DB_CONNECT_TIMEOUT   seconds to wait when opening a connection (default: 5)
 */

export interface PoolOptions {
  connectionLimit: number;
  poolTimeout: number;
  connectTimeout: number;
}

const intFromEnv = (value: string | undefined, fallback: number): number => {
  if (value == null) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

/** Read pool options from the environment with safe defaults */
export const poolOptionsFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): PoolOptions => ({
  connectionLimit: intFromEnv(env.DB_CONNECTION_LIMIT, 10),
  poolTimeout: intFromEnv(env.DB_POOL_TIMEOUT, 10),
  connectTimeout: intFromEnv(env.DB_CONNECT_TIMEOUT, 5),
});

/**
 * Append pooling parameters to a database URL.
 * Parameters already present in the URL are respected (not overridden),
 * so operators can still tune a single environment via DATABASE_URL alone.
 */
export const buildDatabaseUrl = (
  baseUrl: string | undefined,
  options: PoolOptions = poolOptionsFromEnv(),
): string | undefined => {
  if (!baseUrl) return baseUrl;
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    // Leave malformed/exotic URLs untouched rather than break startup
    return baseUrl;
  }
  const params = url.searchParams;
  if (!params.has('connection_limit'))
    params.set('connection_limit', String(options.connectionLimit));
  if (!params.has('pool_timeout'))
    params.set('pool_timeout', String(options.poolTimeout));
  if (!params.has('connect_timeout'))
    params.set('connect_timeout', String(options.connectTimeout));
  return url.toString();
};
