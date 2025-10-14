import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { casinoRoutes } from './routes/casinos';
import { healthRoutes } from './routes/health';

export async function buildApp() {
  const fastify = Fastify({
    logger,
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  // Register plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: parseInt(process.env.API_RATE_LIMIT || '100', 10),
    timeWindow: parseInt(process.env.API_RATE_LIMIT_WINDOW || '60000', 10),
    errorResponseBuilder: () => ({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests, please try again later',
      statusCode: 429,
    }),
  });

  // Error handler
  fastify.setErrorHandler(errorHandler);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(casinoRoutes, { prefix: '/api/casinos' });

  // Root endpoint
  fastify.get('/', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        name: 'FarePlay Discovery Service',
        version: '1.0.0',
        protocolVersion: '1.0.0',
        description: 'Registry and metadata hub for Fare Protocol casinos',
        endpoints: {
          health: '/health',
          ready: '/health/ready',
          live: '/health/live',
          casinos: 'GET /api/casinos',
          casinoById: 'GET /api/casinos/:id',
          casinoByKey: 'GET /api/casinos/by-key/:publicKey',
          register: 'POST /api/casinos/register',
          heartbeat: 'POST /api/casinos/heartbeat',
          update: 'PATCH /api/casinos',
          stats: 'GET /api/casinos/stats',
        },
      },
      timestamp: Date.now(),
    });
  });

  return fastify;
}

