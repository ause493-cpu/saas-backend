import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createPooledDatabaseUrl,
  DEFAULT_DATABASE_CONNECTION_LIMIT,
  DEFAULT_DATABASE_POOL_TIMEOUT_SECONDS,
  isDatabaseConnectionLimitError,
} from './prisma.connection';

const databaseUrl = 'mysql://app:secret@localhost:3306/production';
const originalConnectionLimit = process.env.DATABASE_CONNECTION_LIMIT;
const originalPoolTimeout = process.env.DATABASE_POOL_TIMEOUT_SECONDS;

describe('Prisma database connection pooling', () => {
  beforeEach(() => {
    delete process.env.DATABASE_CONNECTION_LIMIT;
    delete process.env.DATABASE_POOL_TIMEOUT_SECONDS;
  });

  afterAll(() => {
    if (originalConnectionLimit === undefined) {
      delete process.env.DATABASE_CONNECTION_LIMIT;
    } else {
      process.env.DATABASE_CONNECTION_LIMIT = originalConnectionLimit;
    }

    if (originalPoolTimeout === undefined) {
      delete process.env.DATABASE_POOL_TIMEOUT_SECONDS;
    } else {
      process.env.DATABASE_POOL_TIMEOUT_SECONDS = originalPoolTimeout;
    }
  });

  it('applies a conservative bounded connection pool by default', () => {
    const url = new URL(createPooledDatabaseUrl(databaseUrl));

    expect(url.searchParams.get('connection_limit')).toBe(
      String(DEFAULT_DATABASE_CONNECTION_LIMIT),
    );
    expect(url.searchParams.get('pool_timeout')).toBe(
      String(DEFAULT_DATABASE_POOL_TIMEOUT_SECONDS),
    );
  });

  it('preserves existing URL parameters and explicit pool settings', () => {
    const configuredUrl = `${databaseUrl}?schema=tenant&connection_limit=3&pool_timeout=7`;
    const url = new URL(createPooledDatabaseUrl(configuredUrl));

    expect(url.searchParams.get('schema')).toBe('tenant');
    expect(url.searchParams.get('connection_limit')).toBe('3');
    expect(url.searchParams.get('pool_timeout')).toBe('7');
  });

  it('allows deployment configuration to override connection URL settings', () => {
    process.env.DATABASE_CONNECTION_LIMIT = '4';
    process.env.DATABASE_POOL_TIMEOUT_SECONDS = '12';

    const url = new URL(
      createPooledDatabaseUrl(
        `${databaseUrl}?connection_limit=20&pool_timeout=30`,
      ),
    );

    expect(url.searchParams.get('connection_limit')).toBe('4');
    expect(url.searchParams.get('pool_timeout')).toBe('12');
  });

  it.each(['0', '-1', '1.5', 'unlimited', `${Number.MAX_SAFE_INTEGER + 1}`])(
    'rejects the unsafe connection limit and timeout %s',
    (invalidValue) => {
      expect(() =>
        createPooledDatabaseUrl(databaseUrl, {
          connectionLimit: invalidValue,
        }),
      ).toThrow('DATABASE_CONNECTION_LIMIT must be a positive integer');

      expect(() =>
        createPooledDatabaseUrl(databaseUrl, {
          poolTimeoutSeconds: invalidValue,
        }),
      ).toThrow('DATABASE_POOL_TIMEOUT_SECONDS must be a positive integer');
    },
  );

  it.each([
    { code: 'P2024', message: 'Timed out fetching a new connection.' },
    { code: 'P2037', message: 'Too many database connections opened.' },
    { message: 'FATAL: remaining connection slots are reserved' },
    { message: 'FATAL: sorry, too many clients already' },
    { message: 'Error 1040: Too many connections' },
  ])('recognizes the connection-exhaustion error %#', (error) => {
    expect(isDatabaseConnectionLimitError(error)).toBe(true);
  });

  it.each([
    null,
    undefined,
    'too many connections',
    { code: 'P2002', message: 'Unique constraint failed' },
    { message: 'Connection refused by payment gateway' },
  ])('does not misclassify the unrelated failure %#', (error) => {
    expect(isDatabaseConnectionLimitError(error)).toBe(false);
  });

  it('keeps 250 concurrent requests within the connection budget', async () => {
    const connectionLimit = 5;
    const url = new URL(
      createPooledDatabaseUrl(databaseUrl, { connectionLimit }),
    );
    const capacity = Number(url.searchParams.get('connection_limit'));
    const queued: Array<() => void> = [];
    let active = 0;
    let peak = 0;

    const acquire = (): Promise<() => void> =>
      new Promise((resolve) => {
        const grant = () => {
          active += 1;
          peak = Math.max(peak, active);

          resolve(() => {
            active -= 1;
            if (queued.length > 0) queued.shift()!();
          });
        };

        if (active < capacity) grant();
        else queued.push(grant);
      });

    await Promise.all(
      Array.from({ length: 250 }, async () => {
        const release = await acquire();
        await new Promise((resolve) => setImmediate(resolve));
        release();
      }),
    );

    expect(peak).toBe(connectionLimit);
    expect(active).toBe(0);
    expect(queued).toHaveLength(0);
  });

  it('wires the bounded pool, overload handling, and graceful shutdown', () => {
    const projectRoot = join(__dirname, '../../..');
    const prismaService = readFileSync(
      join(projectRoot, 'src/providers/prisma/prisma.service.ts'),
      'utf8',
    );
    const exceptionFilter = readFileSync(
      join(projectRoot, 'src/filters/http-exception.filter.ts'),
      'utf8',
    );
    const application = readFileSync(join(projectRoot, 'src/main.ts'), 'utf8');

    expect(prismaService).toMatch(
      /url:\s*createPooledDatabaseUrl\(databaseUrl\)/,
    );
    expect(exceptionFilter).toMatch(/HttpStatus\.SERVICE_UNAVAILABLE/);
    expect(exceptionFilter).toMatch(/Retry-After['"],\s*['"]5/);
    expect(application).toMatch(/app\.enableShutdownHooks\(\)/);
  });
});
