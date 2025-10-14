import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { 
  createTestApp, 
  createTestKeypair, 
  createSignedRegistration,
  makeRequest 
} from '../utils/testHelpers';
import { ErrorCodes } from '../../src/types';

describe('Casino Registration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/casinos/register', () => {
    it('should register a new casino with valid signature', async () => {
      const keypair = createTestKeypair();
      const registration = createSignedRegistration(keypair);

      const response = await makeRequest(app, 'POST', '/api/casinos/register', registration);

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: registration.name,
        url: registration.url,
        publicKey: keypair.publicKey.toBase58(),
        status: 'online',
        version: '1.0.0',
      });
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.timestamp).toBeTruthy();
    });

    it('should reject registration with invalid signature', async () => {
      const keypair = createTestKeypair();
      const registration = createSignedRegistration(keypair);
      
      // Tamper with the signature
      registration.signature = 'invalid_signature';

      const response = await makeRequest(app, 'POST', '/api/casinos/register', registration);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe(ErrorCodes.INVALID_SIGNATURE);
    });

    it('should reject duplicate casino registration', async () => {
      const keypair = createTestKeypair();
      const registration = createSignedRegistration(keypair);

      // First registration should succeed
      await makeRequest(app, 'POST', '/api/casinos/register', registration);

      // Second registration with same public key should fail
      const duplicateRegistration = createSignedRegistration(keypair, {
        name: 'Different Name',
      });

      const response = await makeRequest(app, 'POST', '/api/casinos/register', duplicateRegistration);

      expect(response.statusCode).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe(ErrorCodes.CASINO_ALREADY_EXISTS);
    });

    it('should validate required fields', async () => {
      const keypair = createTestKeypair();
      const invalidRegistration = {
        url: 'https://test.com',
        publicKey: keypair.publicKey.toBase58(),
        signature: 'test',
        metadata: {},
      };

      const response = await makeRequest(app, 'POST', '/api/casinos/register', invalidRegistration);

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should validate URL format', async () => {
      const keypair = createTestKeypair();
      const registration = createSignedRegistration(keypair, {
        url: 'not-a-valid-url',
      });

      const response = await makeRequest(app, 'POST', '/api/casinos/register', registration);

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept minimal metadata', async () => {
      const keypair = createTestKeypair();
      const registration = createSignedRegistration(keypair, {
        metadata: {
          games: [],
          supportedTokens: ['SOL'],
        },
      });

      const response = await makeRequest(app, 'POST', '/api/casinos/register', registration);

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.games).toEqual([]);
      expect(response.body.data.metadata.supportedTokens).toEqual(['SOL']);
    });

    it('should store all metadata fields correctly', async () => {
      const keypair = createTestKeypair();
      const registration = createSignedRegistration(keypair, {
        metadata: {
          description: 'Full featured casino',
          games: ['slots', 'roulette', 'dice', 'crash'],
          logo: 'https://casino.com/logo.png',
          banner: 'https://casino.com/banner.png',
          socialLinks: {
            twitter: 'https://twitter.com/casino',
            discord: 'https://discord.gg/casino',
            telegram: 'https://t.me/casino',
            website: 'https://casino.com',
          },
          minBetAmount: 0.1,
          maxBetAmount: 1000,
          supportedTokens: ['SOL', 'USDC', 'BONK'],
        },
      });

      const response = await makeRequest(app, 'POST', '/api/casinos/register', registration);

      expect(response.statusCode).toBe(201);
      expect(response.body.data.metadata).toMatchObject(registration.metadata);
    });
  });
});

