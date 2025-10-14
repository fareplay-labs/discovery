import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  createTestApp,
  registerTestCasino,
  createSignedHeartbeat,
  makeRequest,
} from '../utils/testHelpers';

describe('Casino Discovery', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/casinos', () => {
    it('should list all casinos', async () => {
      await registerTestCasino(app, undefined, { name: 'Casino 1' });
      await registerTestCasino(app, undefined, { name: 'Casino 2' });
      await registerTestCasino(app, undefined, { name: 'Casino 3' });

      const response = await makeRequest(app, 'GET', '/api/casinos');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.casinos).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
    });

    it('should filter by status', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      await registerTestCasino(app);

      // Set one to maintenance
      await makeRequest(
        app,
        'POST',
        '/api/casinos/heartbeat',
        createSignedHeartbeat(casinoId, keypair, { status: 'maintenance' })
      );

      const response = await makeRequest(app, 'GET', '/api/casinos?status=maintenance');

      expect(response.statusCode).toBe(200);
      expect(response.body.data.casinos).toHaveLength(1);
      expect(response.body.data.casinos[0].status).toBe('maintenance');
    });

    it('should filter by games', async () => {
      await registerTestCasino(app, undefined, {
        metadata: { games: ['slots', 'roulette'], supportedTokens: ['SOL'] },
      });
      await registerTestCasino(app, undefined, {
        metadata: { games: ['dice', 'crash'], supportedTokens: ['SOL'] },
      });

      const response = await makeRequest(app, 'GET', '/api/casinos?games=slots');

      expect(response.statusCode).toBe(200);
      expect(response.body.data.casinos).toHaveLength(1);
      expect(response.body.data.casinos[0].metadata.games).toContain('slots');
    });

    it('should respect limit parameter', async () => {
      await registerTestCasino(app);
      await registerTestCasino(app);
      await registerTestCasino(app);
      await registerTestCasino(app);

      const response = await makeRequest(app, 'GET', '/api/casinos?limit=2');

      expect(response.statusCode).toBe(200);
      expect(response.body.data.casinos).toHaveLength(2);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.total).toBe(4);
    });

    it('should handle offset pagination', async () => {
      await registerTestCasino(app);
      await registerTestCasino(app);
      await registerTestCasino(app);

      const page1 = await makeRequest(app, 'GET', '/api/casinos?limit=2&offset=0');
      const page2 = await makeRequest(app, 'GET', '/api/casinos?limit=2&offset=2');

      expect(page1.body.data.casinos).toHaveLength(2);
      expect(page2.body.data.casinos).toHaveLength(1);
      
      // Ensure different results
      expect(page1.body.data.casinos[0].id).not.toBe(page2.body.data.casinos[0].id);
    });

    it('should return empty array when no casinos match', async () => {
      const response = await makeRequest(app, 'GET', '/api/casinos?status=offline');

      expect(response.statusCode).toBe(200);
      expect(response.body.data.casinos).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('GET /api/casinos/:id', () => {
    it('should get casino by ID', async () => {
      const { casinoId } = await registerTestCasino(app, undefined, {
        name: 'Test Casino',
      });

      const response = await makeRequest(app, 'GET', `/api/casinos/${casinoId}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(casinoId);
      expect(response.body.data.name).toBe('Test Casino');
    });

    it('should return 404 for non-existent casino', async () => {
      const response = await makeRequest(
        app,
        'GET',
        '/api/casinos/550e8400-e29b-41d4-a716-446655440000'
      );

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/casinos/by-key/:publicKey', () => {
    it('should get casino by public key', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const publicKey = keypair.publicKey.toBase58();

      const response = await makeRequest(app, 'GET', `/api/casinos/by-key/${publicKey}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.id).toBe(casinoId);
      expect(response.body.data.publicKey).toBe(publicKey);
    });

    it('should return 404 for unknown public key', async () => {
      const response = await makeRequest(
        app,
        'GET',
        '/api/casinos/by-key/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
      );

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/casinos/stats', () => {
    it('should return network statistics', async () => {
      await registerTestCasino(app);
      await registerTestCasino(app);

      const response = await makeRequest(app, 'GET', '/api/casinos/stats');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalCasinos: 2,
        onlineCasinos: 2,
      });
    });
  });
});

