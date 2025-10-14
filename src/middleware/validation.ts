import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { verifySolanaSignature, isValidSolanaPublicKey } from '../utils/crypto';
import { ErrorCodes } from '../types';

/**
 * Validates request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Invalid request body',
            details: error.errors,
          },
          timestamp: Date.now(),
        });
      }
      throw error;
    }
  };
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Invalid query parameters',
            details: error.errors,
          },
          timestamp: Date.now(),
        });
      }
      throw error;
    }
  };
}

/**
 * Verifies Solana signature for registration (uses publicKey from body)
 */
export function verifyRegistrationSignature() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    if (!body.signature) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: 'Missing signature',
        },
        timestamp: Date.now(),
      });
    }

    if (!body.publicKey) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: 'Missing publicKey',
        },
        timestamp: Date.now(),
      });
    }

    // Validate public key format
    if (!isValidSolanaPublicKey(body.publicKey)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: 'Invalid Solana public key format',
        },
        timestamp: Date.now(),
      });
    }

    // Create message from body (excluding signature)
    // Sort keys for deterministic signing (matches SDK)
    const { signature, ...dataToSign } = body;
    const message = JSON.stringify(dataToSign, Object.keys(dataToSign).sort());

    // Verify signature
    const isValid = verifySolanaSignature(message, signature, body.publicKey);
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
  };
}

/**
 * Verifies Solana signature for updates (looks up casino by ID)
 */
export function verifyUpdateSignature() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    if (!body.signature) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: 'Missing signature',
        },
        timestamp: Date.now(),
      });
    }

    // For updates, we need to look up the casino to get the public key
    // This will be handled in the route handler for now
    // Since we need database access
  };
}
