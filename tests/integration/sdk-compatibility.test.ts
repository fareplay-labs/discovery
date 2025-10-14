import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, createTestKeypair, signMessage, makeRequest, registerTestCasino, createSignatureMessage } from '../utils/testHelpers';

/**
 * SDK Compatibility Tests
 * These tests verify that the Discovery Service is 100% compatible with the @fareplay/sdk schemas
 */
describe('SDK Compatibility', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ApiResponse Format', () => {
    it('should return ApiResponse format on success', async () => {
      const keypair = createTestKeypair();
      const data = {
        name: 'Test Casino',
        url: 'https://test.com',
        publicKey: keypair.publicKey.toBase58(),
        metadata: {
          games: ['slots'],
          supportedTokens: ['SOL'],
        },
      };

      const signature = signMessage(createSignatureMessage(data), keypair);
      const response = await makeRequest(app, 'POST', '/api/casinos/register', {
        ...data,
        signature,
      });

      // Verify ApiResponse structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(true);
      expect(response.body.timestamp).toBeTypeOf('number');
      expect(response.body.data).toBeDefined();
    });

    it('should return ApiResponse format on error', async () => {
      const response = await makeRequest(app, 'POST', '/api/casinos/register', {
        invalid: 'data',
      });

      // Verify ApiResponse structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('CasinoMetadata Structure', () => {
    it('should return complete CasinoMetadata on registration', async () => {
      const keypair = createTestKeypair();
      const data = {
        name: 'Full Casino',
        url: 'https://fullcasino.com',
        publicKey: keypair.publicKey.toBase58(),
        metadata: {
          description: 'A complete casino',
          games: ['slots', 'roulette', 'dice'],
          logo: 'https://fullcasino.com/logo.png',
          banner: 'https://fullcasino.com/banner.png',
          socialLinks: {
            twitter: 'https://twitter.com/fullcasino',
            discord: 'https://discord.gg/fullcasino',
          },
          minBetAmount: 0.01,
          maxBetAmount: 100,
          supportedTokens: ['SOL', 'USDC'],
        },
      };

      const signature = signMessage(createSignatureMessage(data), keypair);
      const response = await makeRequest(app, 'POST', '/api/casinos/register', {
        ...data,
        signature,
      });

      const casino = response.body.data;

      // Verify all required CasinoMetadata fields
      expect(casino).toHaveProperty('id');
      expect(casino).toHaveProperty('name');
      expect(casino).toHaveProperty('url');
      expect(casino).toHaveProperty('publicKey');
      expect(casino).toHaveProperty('status');
      expect(casino).toHaveProperty('metadata');
      expect(casino).toHaveProperty('createdAt');
      expect(casino).toHaveProperty('updatedAt');
      expect(casino).toHaveProperty('version');

      // Verify metadata structure
      expect(casino.metadata).toHaveProperty('games');
      expect(casino.metadata).toHaveProperty('supportedTokens');
      expect(Array.isArray(casino.metadata.games)).toBe(true);
      expect(Array.isArray(casino.metadata.supportedTokens)).toBe(true);

      // Verify timestamps are numbers
      expect(typeof casino.createdAt).toBe('number');
      expect(typeof casino.updatedAt).toBe('number');
    });
  });

  describe('CasinoStatus Enum', () => {
    it('should accept all valid status values', async () => {
      const statuses = ['online', 'offline', 'maintenance', 'suspended'] as const;

      for (const status of statuses) {
        const { casinoId, keypair } = await registerTestCasino(app);
        
        const heartbeat = {
          casinoId,
          status,
          timestamp: Date.now(),
        };

        const signature = signMessage(JSON.stringify(heartbeat), keypair);
        const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', {
          ...heartbeat,
          signature,
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should reject invalid status values', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      
      const heartbeat = {
        casinoId,
        status: 'invalid_status',
        timestamp: Date.now(),
      };

      const signature = signMessage(JSON.stringify(heartbeat), keypair);
      const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', {
        ...heartbeat,
        signature,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GameType Enum', () => {
    it('should accept all valid game types', async () => {
      const gameTypes = ['slots', 'roulette', 'dice', 'crash', 'coinflip', 'rps', 'bombs', 'cards'];
      const keypair = createTestKeypair();

      const data = {
        name: 'Game Casino',
        url: 'https://gamecasino.com',
        publicKey: keypair.publicKey.toBase58(),
        metadata: {
          games: gameTypes,
          supportedTokens: ['SOL'],
        },
      };

      const signature = signMessage(createSignatureMessage(data), keypair);
      const response = await makeRequest(app, 'POST', '/api/casinos/register', {
        ...data,
        signature,
      });

      expect(response.statusCode).toBe(201);
      expect(response.body.data.metadata.games).toEqual(gameTypes);
    });

    it('should reject invalid game types', async () => {
      const keypair = createTestKeypair();

      const data = {
        name: 'Invalid Casino',
        url: 'https://invalid.com',
        publicKey: keypair.publicKey.toBase58(),
        metadata: {
          games: ['invalid_game'],
          supportedTokens: ['SOL'],
        },
      };

      const signature = signMessage(createSignatureMessage(data), keypair);
      const response = await makeRequest(app, 'POST', '/api/casinos/register', {
        ...data,
        signature,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('CasinoFilters Query', () => {
    it('should handle limit/offset pagination (SDK style)', async () => {
      await registerTestCasino(app);
      await registerTestCasino(app);
      await registerTestCasino(app);

      const response = await makeRequest(app, 'GET', '/api/casinos?limit=2&offset=1');

      expect(response.statusCode).toBe(200);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.offset).toBe(1);
      expect(response.body.data.casinos).toHaveLength(2);
    });

    it('should use SDK default values', async () => {
      const response = await makeRequest(app, 'GET', '/api/casinos');

      expect(response.statusCode).toBe(200);
      expect(response.body.data.limit).toBe(20); // SDK default
      expect(response.body.data.offset).toBe(0); // SDK default
    });
  });

  describe('Error Codes', () => {
    it('should use SDK error codes', async () => {
      const keypair = createTestKeypair();
      const invalidData = {
        name: 'Test',
        url: 'https://test.com',
        publicKey: keypair.publicKey.toBase58(),
        signature: 'invalid',
        metadata: {},
      };

      const response = await makeRequest(app, 'POST', '/api/casinos/register', invalidData);

      expect(response.body.error?.code).toBe('INVALID_SIGNATURE');
    });
  });
});

// Use the standard test helper (it already exists)
// Import is at the top: import { registerTestCasino } from '../utils/testHelpers';

