export const DEFAULT_DATABASE_CONNECTION_LIMIT = 5;
export const DEFAULT_DATABASE_POOL_TIMEOUT_SECONDS = 10;

interface DatabaseConnectionOptions {
  connectionLimit?: string | number;
  poolTimeoutSeconds?: string | number;
}

function positiveInteger(value: string | number, name: string): number {
  const normalized = String(value).trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${name} must be a positive integer`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function createPooledDatabaseUrl(
  databaseUrl: string,
  options: DatabaseConnectionOptions = {},
): string {
  const url = new URL(databaseUrl);
  const connectionLimit =
    options.connectionLimit ??
    process.env.DATABASE_CONNECTION_LIMIT ??
    url.searchParams.get('connection_limit') ??
    DEFAULT_DATABASE_CONNECTION_LIMIT;
  const poolTimeoutSeconds =
    options.poolTimeoutSeconds ??
    process.env.DATABASE_POOL_TIMEOUT_SECONDS ??
    url.searchParams.get('pool_timeout') ??
    DEFAULT_DATABASE_POOL_TIMEOUT_SECONDS;

  url.searchParams.set(
    'connection_limit',
    String(positiveInteger(connectionLimit, 'DATABASE_CONNECTION_LIMIT')),
  );
  url.searchParams.set(
    'pool_timeout',
    String(
      positiveInteger(poolTimeoutSeconds, 'DATABASE_POOL_TIMEOUT_SECONDS'),
    ),
  );

  return url.toString();
}

export function isDatabaseConnectionLimitError(exception: unknown): boolean {
  if (!exception || typeof exception !== 'object') return false;

  const error = exception as { code?: unknown; message?: unknown };

  if (error.code === 'P2024' || error.code === 'P2037') return true;

  return (
    typeof error.message === 'string' &&
    /too many (?:database )?connections|too many clients already|remaining connection slots are reserved|timed out fetching a new connection from the connection pool/i.test(
      error.message,
    )
  );
}
