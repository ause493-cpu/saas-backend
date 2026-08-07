import {
  buildDatabaseUrl,
  poolOptionsFromEnv,
} from '../src/providers/prisma/connection';

describe('database connection pooling', () => {
  describe('poolOptionsFromEnv', () => {
    it('uses safe defaults when env vars are missing', () => {
      expect(poolOptionsFromEnv({})).toEqual({
        connectionLimit: 10,
        poolTimeout: 10,
        connectTimeout: 5,
      });
    });

    it('reads values from the environment', () => {
      expect(
        poolOptionsFromEnv({
          DB_CONNECTION_LIMIT: '25',
          DB_POOL_TIMEOUT: '20',
          DB_CONNECT_TIMEOUT: '8',
        }),
      ).toEqual({ connectionLimit: 25, poolTimeout: 20, connectTimeout: 8 });
    });

    it('falls back to defaults on invalid values', () => {
      expect(
        poolOptionsFromEnv({
          DB_CONNECTION_LIMIT: 'lots',
          DB_POOL_TIMEOUT: '-3',
        }),
      ).toEqual({ connectionLimit: 10, poolTimeout: 10, connectTimeout: 5 });
    });
  });

  describe('buildDatabaseUrl', () => {
    const options = { connectionLimit: 10, poolTimeout: 10, connectTimeout: 5 };

    it('appends pooling parameters to a bare URL', () => {
      const url = buildDatabaseUrl('mysql://root:pw@db:3306/api', options);
      expect(url).toContain('connection_limit=10');
      expect(url).toContain('pool_timeout=10');
      expect(url).toContain('connect_timeout=5');
    });

    it('respects parameters already present in the URL', () => {
      const url = buildDatabaseUrl(
        'mysql://root:pw@db:3306/api?connection_limit=3',
        options,
      );
      expect(url).toContain('connection_limit=3');
      expect(url).not.toContain('connection_limit=10');
      expect(url).toContain('pool_timeout=10');
    });

    it('preserves unrelated query parameters', () => {
      const url = buildDatabaseUrl(
        'mysql://root:pw@db:3306/api?sslaccept=strict',
        options,
      );
      expect(url).toContain('sslaccept=strict');
      expect(url).toContain('connection_limit=10');
    });

    it('returns undefined/malformed input unchanged', () => {
      expect(buildDatabaseUrl(undefined, options)).toBeUndefined();
      expect(buildDatabaseUrl('not a url', options)).toBe('not a url');
    });
  });
});
