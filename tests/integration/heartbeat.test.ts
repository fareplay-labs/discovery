import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  createTestApp,
  createTestKeypair,
  createSignedHeartbeat,
  registerTestCasino,
  makeRequest,
} from '../utils/testHelpers';
import { ErrorCodes } from '../../src/types';

describe('Casino Heartbeat', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/casinos/heartbeat', () => {
    it('should accept valid heartbeat from registered casino', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const heartbeat = createSignedHeartbeat(casinoId, keypair);

      const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', heartbeat);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        success: true,
        nextHeartbeatIn: 60,
      });
    });

    it('should update casino status from heartbeat', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      
      // Send maintenance heartbeat
      const heartbeat = createSignedHeartbeat(casinoId, keypair, {
        status: 'maintenance',
      });

      await makeRequest(app, 'POST', '/api/casinos/heartbeat', heartbeat);

      // Verify status was updated
      const casinoResponse = await makeRequest(app, 'GET', `/api/casinos/${casinoId}`);
      expect(casinoResponse.body.data.status).toBe('maintenance');
    });

    it('should store heartbeat metrics', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const heartbeat = createSignedHeartbeat(casinoId, keypair, {
        metrics: {
          activePlayers: 250,
          totalBets24h: 10000,
          uptime: 7200,
          responseTime: 75,
        },
      });

      const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', heartbeat);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept heartbeat without metrics', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const heartbeat = createSignedHeartbeat(casinoId, keypair, {
        metrics: undefined,
      });

      const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', heartbeat);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject heartbeat with invalid signature', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const heartbeat = createSignedHeartbeat(casinoId, keypair);
      
      // Tamper with signature
      heartbeat.signature = 'invalid_signature';

      const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', heartbeat);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe(ErrorCodes.INVALID_SIGNATURE);
    });

    it('should reject heartbeat from non-existent casino', async () => {
      const keypair = createTestKeypair();
      const heartbeat = createSignedHeartbeat('550e8400-e29b-41d4-a716-446655440000', keypair);

      const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', heartbeat);

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe(ErrorCodes.CASINO_NOT_FOUND);
    });

    it('should validate status enum', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const heartbeat = createSignedHeartbeat(casinoId, keypair, {
        status: 'invalid_status' as any,
      });

      const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', heartbeat);

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should update lastHeartbeat timestamp', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);

      // Get initial casino state
      const before = await makeRequest(app, 'GET', `/api/casinos/${casinoId}`);
      const initialHeartbeat = before.body.data.lastHeartbeat;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send heartbeat
      const heartbeat = createSignedHeartbeat(casinoId, keypair);
      await makeRequest(app, 'POST', '/api/casinos/heartbeat', heartbeat);

      // Verify timestamp updated
      const after = await makeRequest(app, 'GET', `/api/casinos/${casinoId}`);
      expect(after.body.data.lastHeartbeat).toBeGreaterThan(initialHeartbeat || 0);
    });
  });
});

