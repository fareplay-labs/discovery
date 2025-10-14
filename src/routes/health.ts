import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';

export async function healthRoutes(fastify: FastifyInstance) {
  // GET /health - Basic health check
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        status: 'ok',
      },
      timestamp: Date.now(),
    });
  });

  // GET /health/ready - Readiness probe (checks DB connection)
  fastify.get('/health/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({
        success: true,
        data: {
          status: 'ready',
          database: 'connected',
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      return reply.status(503).send({
        success: false,
        data: {
          status: 'not ready',
          database: 'disconnected',
        },
        timestamp: Date.now(),
      });
    }
  });

  // GET /health/live - Liveness probe
  fastify.get('/health/live', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        status: 'alive',
      },
      timestamp: Date.now(),
    });
  });
}

