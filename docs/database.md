# Database

Staart uses [prisma/prisma](https://github.com/prisma/prisma) under the hood, which is a modern ORM alternative. You can ues any of the databases supported by Prisma: PostgreSQL, MySQL, or SQLite. Support for Microsoft SQL Server is also in beta. Your database should already be created before setting up the connection.

## Database connection

To get started, add the required required environment variables in your `.env` file. The `DATABASE_URL` variable is usually set with [dotenv-expand](https://github.com/motdotla/dotenv-expand) variables:

```env title=".env"
DATABASE_URL = "${DB_PROVIDER}://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_POST}/${DB_NAME}"
```

Then, you can set the individual environment variables:

| Environment variable | Description                      |
| -------------------- | -------------------------------- |
| `DB_PROVIDER`        | Database provider, e.g., "mysql" |
| `DB_USER`            | Username                         |
| `DB_PASSWORD`        | Password                         |
| `DB_HOST`            | Hostname                         |
| `DB_PORT`            | Database port, e.g., 3306        |
| `DB_NAME`            | Databse name to use              |

Alternately, you can also set the `DATABASE_URL` variable directly. For more information about this connection, you can visit the article on the Prisma website: [Using environment variables](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-schema#using-environment-variables).

## Connection pooling

Each application worker uses a bounded Prisma connection pool. By default a
worker may open at most five database connections and waits up to 10 seconds
for a connection before returning a retryable HTTP 503 response.

```env
DATABASE_CONNECTION_LIMIT = 5
DATABASE_POOL_TIMEOUT_SECONDS = 10
```

The configured connection limit applies per worker, not across the entire
deployment. Keep the total connection budget below the database's available
capacity:

```text
application instances × workers per instance × DATABASE_CONNECTION_LIMIT
  <= database connection limit - connections reserved for other services
```

Existing `connection_limit` and `pool_timeout` query parameters in
`DATABASE_URL` are preserved unless their corresponding environment variables
are explicitly set. Invalid, zero, and non-integer limits are rejected during
application startup. During pool exhaustion clients receive HTTP 503 and a
`Retry-After: 5` header, and shutdown signals release Prisma connections before
the worker exits.

## Setting up

When you're setting your database for the first time, you should use the `prisma db push` command:

```
npx prisma db push --preview-feature
```

When you make changes to your database schema, you should use the `prisma migrate` command:

```
npx prisma migrate save --experimental
npx prisma migrate up --experimental
```

You can learn more about the `migrate` command on the documentation page: [Prisma Migrate](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-migrate).
