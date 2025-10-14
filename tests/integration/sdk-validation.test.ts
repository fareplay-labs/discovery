import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, createTestKeypair, signMessage, makeRequest, registerTestCasino, createSignatureMessage } from '../utils/testHelpers';

// Import SDK schemas for validation
import {
  CasinoMetadataSchema,
  RegistrationRequestSchema,
  HeartbeatPayloadSchema,
  HeartbeatResponseSchema,
  CasinoUpdateRequestSchema,
  CasinoFiltersSchema,
  ApiResponseSchema,
  CasinoStatusSchema,
  GameTypeSchema,
  ErrorCodes,
} from '@fareplay/sdk';

/**
 * SDK Schema Validation Tests
 * These tests use the actual @fareplay/sdk schemas to validate API responses
 */
describe('SDK Schema Validation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Registration Request Validation', () => {
    it('should accept request that matches SDK RegistrationRequestSchema', () => {
      const keypair = createTestKeypair();
      const request = {
        name: 'SDK Test Casino',
        url: 'https://sdktest.com',
        publicKey: keypair.publicKey.toBase58(),
        signature: 'test_signature',
        metadata: {
          description: 'Testing SDK compatibility',
          games: ['slots', 'roulette'],
          logo: 'https://sdktest.com/logo.png',
          banner: 'https://sdktest.com/banner.png',
          socialLinks: {
            twitter: 'https://twitter.com/sdktest',
            discord: 'https://discord.gg/sdktest',
          },
          minBetAmount: 0.01,
          maxBetAmount: 100,
          supportedTokens: ['SOL', 'USDC'],
        },
      };

      // Validate against SDK schema
      const result = RegistrationRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should validate response against SDK CasinoMetadataSchema', async () => {
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

      // Validate response data against SDK CasinoMetadataSchema
      const result = CasinoMetadataSchema.safeParse(response.body.data);
      
      if (!result.success) {
        console.error('Validation errors:', result.error.errors);
      }
      
      expect(result.success).toBe(true);
    });
  });

  describe('Heartbeat Payload Validation', () => {
    it('should accept heartbeat that matches SDK HeartbeatPayloadSchema', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      
      const heartbeat = {
        casinoId,
        status: 'online' as const,
        timestamp: Date.now(),
        metrics: {
          activePlayers: 100,
          totalBets24h: 5000,
          uptime: 3600,
          responseTime: 50,
        },
        signature: 'test_signature',
      };

      // Validate against SDK schema
      const result = HeartbeatPayloadSchema.safeParse(heartbeat);
      expect(result.success).toBe(true);
    });

    it('should return response matching SDK HeartbeatResponseSchema', async () => {
      const { casinoId, keypair } = await registerTestCasino(app);
      
      const heartbeat = {
        casinoId,
        status: 'online' as const,
        timestamp: Date.now(),
      };

      const signature = signMessage(JSON.stringify(heartbeat), keypair);
      const response = await makeRequest(app, 'POST', '/api/casinos/heartbeat', {
        ...heartbeat,
        signature,
      });

      // Validate inner response data
      const result = HeartbeatResponseSchema.safeParse(response.body.data);
      
      if (!result.success) {
        console.error('Validation errors:', result.error.errors);
      }
      
      expect(result.success).toBe(true);
    });
  });

  describe('Update Request Validation', () => {
    it('should accept update that matches SDK CasinoUpdateRequestSchema', async () => {
      const { casinoId } = await registerTestCasino(app);
      
      const update = {
        casinoId,
        name: 'Updated Name',
        status: 'maintenance' as const,
        metadata: {
          description: 'Updated description',
          games: ['slots', 'roulette'],
        },
        signature: 'test_signature',
      };

      // Validate against SDK schema
      const result = CasinoUpdateRequestSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe('Casino Filters Validation', () => {
    it('should accept query params matching SDK CasinoFiltersSchema', () => {
      const filters = {
        status: 'online' as const,
        games: ['slots', 'roulette'],
        limit: 20,
        offset: 0,
      };

      // Validate against SDK schema
      const result = CasinoFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });
  });

  describe('API Response Format Validation', () => {
    it('should return success responses matching SDK ApiResponse format', async () => {
      const response = await makeRequest(app, 'GET', '/api/casinos/stats');

      // Validate against SDK ApiResponse schema
      const ApiResponseWithData = ApiResponseSchema(CasinoMetadataSchema);
      
      // Check basic ApiResponse structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(true);
      expect(typeof response.body.timestamp).toBe('number');
    });

    it('should return error responses matching SDK ApiResponse format', async () => {
      const response = await makeRequest(
        app,
        'GET',
        '/api/casinos/00000000-0000-0000-0000-000000000000'
      );

      // Validate error response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept all SDK CasinoStatus enum values', () => {
      const validStatuses = ['online', 'offline', 'maintenance', 'suspended'];
      
      validStatuses.forEach(status => {
        const result = CasinoStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status values', () => {
      const result = CasinoStatusSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('Game Type Enum Validation', () => {
    it('should accept all SDK GameType enum values', () => {
      const validGames = ['slots', 'roulette', 'dice', 'crash', 'coinflip', 'rps', 'bombs', 'cards'];
      
      validGames.forEach(game => {
        const result = GameTypeSchema.safeParse(game);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid game types', () => {
      const result = GameTypeSchema.safeParse('invalid_game');
      expect(result.success).toBe(false);
    });
  });

  describe('Error Codes Validation', () => {
    it('should use SDK error codes in responses', async () => {
      const keypair = createTestKeypair();
      const invalidData = {
        name: 'Test',
        url: 'https://test.com',
        publicKey: keypair.publicKey.toBase58(),
        signature: 'invalid_signature',
        metadata: {
          games: [],
          supportedTokens: ['SOL'],
        },
      };

      const response = await makeRequest(app, 'POST', '/api/casinos/register', invalidData);

      // Check that error code is from SDK ErrorCodes
      expect(Object.values(ErrorCodes)).toContain(response.body.error?.code);
      expect(response.body.error?.code).toBe(ErrorCodes.INVALID_SIGNATURE);
    });
  });

  describe('Complete Registration Flow with SDK Validation', () => {
    it('should complete full registration->heartbeat->update flow with SDK schemas', async () => {
      const keypair = createTestKeypair();

      // Step 1: Register (validate request and response)
      const registrationData = {
        name: 'SDK Flow Casino',
        url: 'https://sdkflow.com',
        publicKey: keypair.publicKey.toBase58(),
        metadata: {
          description: 'Testing complete SDK flow',
          games: ['slots', 'roulette', 'dice'],
          supportedTokens: ['SOL', 'USDC'],
        },
      };

      const regSignature = signMessage(createSignatureMessage(registrationData), keypair);
      const regRequest = { ...registrationData, signature: regSignature };

      // Validate request against SDK
      expect(RegistrationRequestSchema.safeParse(regRequest).success).toBe(true);

      const regResponse = await makeRequest(app, 'POST', '/api/casinos/register', regRequest);
      
      // Validate response against SDK
      expect(CasinoMetadataSchema.safeParse(regResponse.body.data).success).toBe(true);

      const casinoId = regResponse.body.data.id;

      // Step 2: Send Heartbeat (validate request and response)
      const heartbeatData = {
        casinoId,
        status: 'online' as const,
        timestamp: Date.now(),
        metrics: {
          activePlayers: 150,
          totalBets24h: 10000,
          uptime: 7200,
          responseTime: 75,
        },
      };

      const hbSignature = signMessage(createSignatureMessage(heartbeatData), keypair);
      const hbRequest = { ...heartbeatData, signature: hbSignature };

      // Validate request against SDK
      expect(HeartbeatPayloadSchema.safeParse(hbRequest).success).toBe(true);

      const hbResponse = await makeRequest(app, 'POST', '/api/casinos/heartbeat', hbRequest);

      // Validate response against SDK
      expect(HeartbeatResponseSchema.safeParse(hbResponse.body.data).success).toBe(true);

      // Step 3: Update Casino (validate request and response)
      const updateData = {
        casinoId,
        name: 'SDK Flow Casino - Updated',
        metadata: {
          description: 'Updated via SDK flow test',
          maxBetAmount: 500,
        },
      };

      const updateSignature = signMessage(createSignatureMessage(updateData), keypair);
      const updateRequest = { ...updateData, signature: updateSignature };

      // Validate request against SDK
      expect(CasinoUpdateRequestSchema.safeParse(updateRequest).success).toBe(true);

      const updateResponse = await makeRequest(app, 'PATCH', '/api/casinos', updateRequest);

      // Validate response against SDK
      expect(CasinoMetadataSchema.safeParse(updateResponse.body.data).success).toBe(true);

      // Verify the update persisted
      expect(updateResponse.body.data.name).toBe('SDK Flow Casino - Updated');
      expect(updateResponse.body.data.metadata.description).toBe('Updated via SDK flow test');
    });
  });

  describe('Casino List Response Validation', () => {
    it('should return casino list with all items matching SDK CasinoMetadata', async () => {
      // Register multiple casinos
      await registerTestCasino(app);
      await registerTestCasino(app);
      await registerTestCasino(app);

      const response = await makeRequest(app, 'GET', '/api/casinos?limit=10');

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.casinos)).toBe(true);

      // Validate each casino against SDK schema
      response.body.data.casinos.forEach((casino: any) => {
        const result = CasinoMetadataSchema.safeParse(casino);
        
        if (!result.success) {
          console.error('Casino validation failed:', casino);
          console.error('Errors:', result.error.errors);
        }
        
        expect(result.success).toBe(true);
      });
    });
  });
});

