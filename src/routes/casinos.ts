import type { FastifyInstance } from 'fastify';
import { casinoService } from '../services/casinoService';
import {
  RegistrationRequestSchema,
  HeartbeatPayloadSchema,
  CasinoUpdateRequestSchema,
  CasinoFiltersSchema,
  type RegistrationRequest,
  type HeartbeatPayload,
  type CasinoUpdateRequest,
  type CasinoFilters,
  ErrorCodes,
} from '../types';
import { validateBody, validateQuery, verifyRegistrationSignature } from '../middleware/validation';
import { verifySolanaSignature } from '../utils/crypto';

export async function casinoRoutes(fastify: FastifyInstance) {
  // POST /api/casinos/register - Register a new casino
  fastify.post<{ Body: RegistrationRequest }>(
    '/register',
    {
      preHandler: [
        validateBody(RegistrationRequestSchema),
        verifyRegistrationSignature(),
      ],
    },
    async (request, reply) => {
      try {
        const casino = await casinoService.registerCasino(request.body);
        
        return reply.status(201).send({
          success: true,
          data: casino,
          timestamp: Date.now(),
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'CASINO_ALREADY_EXISTS') {
            return reply.status(409).send({
              success: false,
              error: {
                code: ErrorCodes.CASINO_ALREADY_EXISTS,
                message: 'Casino with this public key is already registered',
              },
              timestamp: Date.now(),
            });
          }
        }
        throw error;
      }
    }
  );

  // POST /api/casinos/heartbeat - Send casino heartbeat
  fastify.post<{ Body: HeartbeatPayload }>(
    '/heartbeat',
    {
      preHandler: [validateBody(HeartbeatPayloadSchema)],
    },
    async (request, reply) => {
      try {
        // Get casino to verify signature
        const casino = await casinoService.getCasinoById(request.body.casinoId);
        
        if (!casino) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ErrorCodes.CASINO_NOT_FOUND,
              message: 'Casino not found',
            },
            timestamp: Date.now(),
          });
        }

        // Verify signature
        // Sort keys for deterministic signing (matches SDK)
        const { signature, ...dataToSign } = request.body;
        const message = JSON.stringify(dataToSign, Object.keys(dataToSign).sort());
        const isValid = verifySolanaSignature(message, signature, casino.publicKey);
        
        if (!isValid) {
          return reply.status(401).send({
            success: false,
            error: {
              code: ErrorCodes.INVALID_SIGNATURE,
              message: 'Signature verification failed',
            },
            timestamp: Date.now(),
          });
        }

        const result = await casinoService.updateHeartbeat(request.body);
        
        return reply.status(200).send({
          success: true,
          data: result,
          timestamp: Date.now(),
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'CASINO_NOT_FOUND') {
          return reply.status(404).send({
            success: false,
            error: {
              code: ErrorCodes.CASINO_NOT_FOUND,
              message: 'Casino not found',
            },
            timestamp: Date.now(),
          });
        }
        throw error;
      }
    }
  );

  // PATCH /api/casinos - Update casino metadata
  fastify.patch<{ Body: CasinoUpdateRequest }>(
    '/',
    {
      preHandler: [validateBody(CasinoUpdateRequestSchema)],
    },
    async (request, reply) => {
      try {
        // Get casino to verify signature
        const casino = await casinoService.getCasinoById(request.body.casinoId);
        
        if (!casino) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ErrorCodes.CASINO_NOT_FOUND,
              message: 'Casino not found',
            },
            timestamp: Date.now(),
          });
        }

        // Verify signature
        // Sort keys for deterministic signing (matches SDK)
        const { signature, ...dataToSign } = request.body;
        const message = JSON.stringify(dataToSign, Object.keys(dataToSign).sort());
        const isValid = verifySolanaSignature(message, signature, casino.publicKey);
        
        if (!isValid) {
          return reply.status(401).send({
            success: false,
            error: {
              code: ErrorCodes.INVALID_SIGNATURE,
              message: 'Signature verification failed',
            },
            timestamp: Date.now(),
          });
        }

        const updated = await casinoService.updateCasino(request.body);
        
        return reply.status(200).send({
          success: true,
          data: updated,
          timestamp: Date.now(),
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'CASINO_NOT_FOUND') {
          return reply.status(404).send({
            success: false,
            error: {
              code: ErrorCodes.CASINO_NOT_FOUND,
              message: 'Casino not found',
            },
            timestamp: Date.now(),
          });
        }
        throw error;
      }
    }
  );

  // GET /api/casinos - Get list of casinos (matches SDK filters)
  fastify.get<{ Querystring: CasinoFilters }>(
    '/',
    {
      preHandler: [validateQuery(CasinoFiltersSchema)],
    },
    async (request, reply) => {
      const result = await casinoService.getCasinos(request.query);
      
      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: Date.now(),
      });
    }
  );

  // GET /api/casinos/:id - Get a specific casino by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const casino = await casinoService.getCasinoById(request.params.id);
      
      if (!casino) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ErrorCodes.CASINO_NOT_FOUND,
            message: 'Casino not found',
          },
          timestamp: Date.now(),
        });
      }
      
      return reply.status(200).send({
        success: true,
        data: casino,
        timestamp: Date.now(),
      });
    }
  );

  // GET /api/casinos/by-key/:publicKey - Get casino by public key
  fastify.get<{ Params: { publicKey: string } }>(
    '/by-key/:publicKey',
    async (request, reply) => {
      const casino = await casinoService.getCasinoByPublicKey(request.params.publicKey);
      
      if (!casino) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ErrorCodes.CASINO_NOT_FOUND,
            message: 'Casino not found',
          },
          timestamp: Date.now(),
        });
      }
      
      return reply.status(200).send({
        success: true,
        data: casino,
        timestamp: Date.now(),
      });
    }
  );

  // GET /api/casinos/stats - Get network statistics
  fastify.get('/stats', async (_request, reply) => {
    const stats = await casinoService.getStatistics();
    return reply.status(200).send({
      success: true,
      data: stats,
      timestamp: Date.now(),
    });
  });
}
