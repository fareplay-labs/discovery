import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  createTestApp,
  createSignedUpdate,
  registerTestCasino,
  makeRequest,
} from '../utils/testHelpers';
import { ErrorCodes } from '../../src/types';

describe('Casino Update', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /api/casinos', () => {
    it('should update casino name', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const update = createSignedUpdate(casinoId, keypair, {
        name: 'Updated Casino Name',
      });

      const response = await makeRequest(app, 'PATCH', '/api/casinos', update);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Casino Name');
    });

    it('should update casino status', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const update = createSignedUpdate(casinoId, keypair, {
        status: 'maintenance',
      });

      const response = await makeRequest(app, 'PATCH', '/api/casinos', update);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.status).toBe('maintenance');
    });

    it('should update metadata fields', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const update = createSignedUpdate(casinoId, keypair, {
        metadata: {
          description: 'Updated description',
          games: ['slots', 'crash', 'dice'],
          logo: 'https://newlogo.com/logo.png',
          maxBetAmount: 200,
        },
      });

      const response = await makeRequest(app, 'PATCH', '/api/casinos', update);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.metadata.description).toBe('Updated description');
      expect(response.body.data.metadata.games).toEqual(['slots', 'crash', 'dice']);
      expect(response.body.data.metadata.maxBetAmount).toBe(200);
    });

    it('should update social links', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const update = createSignedUpdate(casinoId, keypair, {
        metadata: {
          socialLinks: {
            twitter: 'https://twitter.com/newhandle',
            telegram: 'https://t.me/newchannel',
          },
        },
      });

      const response = await makeRequest(app, 'PATCH', '/api/casinos', update);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.metadata.socialLinks.twitter).toBe('https://twitter.com/newhandle');
      expect(response.body.data.metadata.socialLinks.telegram).toBe('https://t.me/newchannel');
    });

    it('should reject update with invalid signature', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      const update = createSignedUpdate(casinoId, keypair, {
        name: 'Hacked Name',
      });
      
      update.signature = 'invalid_signature';

      const response = await makeRequest(app, 'PATCH', '/api/casinos', update);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe(ErrorCodes.INVALID_SIGNATURE);
    });

    it('should reject update for non-existent casino', async () => {
      const { keypair } = await registerTestCasino(app);
      const update = createSignedUpdate('550e8400-e29b-41d4-a716-446655440000', keypair, {
        name: 'Test',
      });

      const response = await makeRequest(app, 'PATCH', '/api/casinos', update);

      expect(response.statusCode).toBe(404);
      expect(response.body.error?.code).toBe(ErrorCodes.CASINO_NOT_FOUND);
    });

    it('should preserve unchanged fields', async () => {
      const { casinoId, keypair } = await registerTestCasino(app, undefined, {
        name: 'Original Name',
        url: 'https://original.com',
      });

      // Only update description
      const update = createSignedUpdate(casinoId, keypair, {
        metadata: {
          description: 'New description',
        },
      });

      const response = await makeRequest(app, 'PATCH', '/api/casinos', update);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.name).toBe('Original Name');
      expect(response.body.data.url).toBe('https://original.com');
      expect(response.body.data.metadata.description).toBe('New description');
    });
  });
});

