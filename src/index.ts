import 'dotenv/config';
import { buildApp } from './app';
import { connectDatabase, disconnectDatabase } from './db';
import { casinoService } from './services/casinoService';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const HEARTBEAT_TIMEOUT = parseInt(process.env.HEARTBEAT_TIMEOUT_MINUTES || '10', 10);

async function main() {
  try {
    // Connect to database
    await connectDatabase();

    // Build and start Fastify app
    const app = await buildApp();

    await app.listen({
      port: PORT,
      host: HOST,
    });

    logger.info(`🚀 Server listening on http://${HOST}:${PORT}`);
    logger.info(`📚 API Documentation: http://${HOST}:${PORT}/`);

    // Start background job to mark inactive casinos
    const inactivityCheckInterval = setInterval(async () => {
      try {
        const count = await casinoService.markInactiveCasinos(HEARTBEAT_TIMEOUT);
        if (count > 0) {
          logger.info(`Marked ${count} casino(s) as inactive`);
        }
      } catch (error) {
        logger.error({ err: error }, 'Failed to mark inactive casinos');
      }
    }, 60000); // Check every minute

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      clearInterval(inactivityCheckInterval);
      
      await app.close();
      await disconnectDatabase();
      
      logger.info('✅ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({ err: error }, 'Failed to start application');
    process.exit(1);
  }
}

main();

