import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ApprovedSubnet,
  Email,
  PrismaClient,
  Session,
  User,
} from '@prisma/client';
import { buildDatabaseUrl } from './connection';
import { Expose } from './prisma.interface';

/** Retry configuration for the initial database connection */
const CONNECT_RETRIES = 5;
const CONNECT_BACKOFF_MS = 1000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Bound the connection pool per instance so the sum of all instances
    // stays below the database server's max_connections (outage fix).
    super({
      datasources: {
        mysql: { url: buildDatabaseUrl(process.env.DATABASE_URL) },
      },
    });
  }

  async onModuleInit() {
    // Retry with linear backoff so transient connection-limit pressure
    // during deploys/restarts doesn't crash the instance at boot.
    for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        if (attempt === CONNECT_RETRIES) throw error;
        this.logger.warn(
          `Database connection attempt ${attempt}/${CONNECT_RETRIES} failed, retrying...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, CONNECT_BACKOFF_MS * attempt),
        );
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Delete sensitive keys from an object */
  expose<T>(item: T): Expose<T> {
    if (!item) return {} as T;
    if (((item as any) as Partial<User>).password)
      (item as any).hasPassword = true;
    delete ((item as any) as Partial<User>).password;
    delete ((item as any) as Partial<User>).twoFactorSecret;
    delete ((item as any) as Partial<Session>).token;
    delete ((item as any) as Partial<Email>).emailSafe;
    delete ((item as any) as Partial<ApprovedSubnet>).subnet;
    return item;
  }
}
