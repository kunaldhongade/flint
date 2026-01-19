import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { logger } from './logger';

class DatabaseService {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      const connectionString = process.env.DATABASE_URL;
      const pool = new Pool({ connectionString });
      const adapter = new PrismaPg(pool);

      DatabaseService.instance = new PrismaClient({
        adapter,
        log: [
          { level: 'query', emit: 'event' },
          { level: 'info', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ],
      });

      // @ts-ignore - Prisma types can be tricky with events
      DatabaseService.instance.$on('query', (e: any) => {
        logger.debug('Query: ' + e.query);
        logger.debug('Params: ' + e.params);
        logger.debug('Duration: ' + e.duration + 'ms');
      });
    }
    return DatabaseService.instance;
  }
}

export const prisma = DatabaseService.getInstance();
export default prisma;
