import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { ErrorCodes } from '../types';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error({
    err: error,
    req: {
      method: request.method,
      url: request.url,
      params: request.params,
      query: request.query,
    },
  }, 'Request error');

  // Handle rate limiting
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: {
        code: ErrorCodes.RATE_LIMITED,
        message: 'Too many requests, please try again later',
      },
      timestamp: Date.now(),
    });
  }

  // Map error messages to error codes
  let errorCode: string = ErrorCodes.INTERNAL_ERROR;
  let statusCode = error.statusCode || 500;
  let message = error.message;

  if (message === 'CASINO_NOT_FOUND') {
    errorCode = ErrorCodes.CASINO_NOT_FOUND;
    statusCode = 404;
  } else if (message === 'CASINO_ALREADY_EXISTS') {
    errorCode = ErrorCodes.CASINO_ALREADY_EXISTS;
    statusCode = 409;
  } else if (message === 'INVALID_SIGNATURE') {
    errorCode = ErrorCodes.INVALID_SIGNATURE;
    statusCode = 401;
  } else if (message === 'UNAUTHORIZED') {
    errorCode = ErrorCodes.UNAUTHORIZED;
    statusCode = 401;
  } else if (statusCode === 500) {
    message = 'Internal server error';
  }

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: errorCode,
      message,
    },
    timestamp: Date.now(),
  });
}
