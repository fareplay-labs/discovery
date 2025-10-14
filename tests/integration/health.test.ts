import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, makeRequest } from '../utils/testHelpers';

describe('Health Checks', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await makeRequest(app, 'GET', '/health');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.timestamp).toBeTruthy();
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status with database check', async () => {
      const response = await makeRequest(app, 'GET', '/health/ready');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
      expect(response.body.data.database).toBe('connected');
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await makeRequest(app, 'GET', '/health/live');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('alive');
    });
  });

  describe('GET /', () => {
    it('should return service information', async () => {
      const response = await makeRequest(app, 'GET', '/');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('endpoints');
      expect(response.body.data.protocolVersion).toBe('1.0.0');
    });
  });
});

