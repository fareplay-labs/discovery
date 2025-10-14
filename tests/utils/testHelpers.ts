import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import type { 
  RegistrationRequest, 
  HeartbeatPayload, 
  CasinoUpdateRequest 
} from '../../src/types';

/**
 * Create a test Solana keypair
 */
export function createTestKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Sign a message with a Solana keypair
 */
export function signMessage(message: string, keypair: Keypair): string {
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(signatureBytes);
}

/**
 * Create a deterministic message string from data (matches SDK format)
 */
export function createSignatureMessage(data: Record<string, unknown>): string {
  // Sort keys for deterministic signing (matches SDK)
  return JSON.stringify(data, Object.keys(data).sort());
}

/**
 * Create a signed registration request
 */
export function createSignedRegistration(
  keypair: Keypair,
  overrides?: Partial<Omit<RegistrationRequest, 'signature'>>
): RegistrationRequest {
  const data = {
    name: 'Test Casino',
    url: 'https://testcasino.com',
    publicKey: keypair.publicKey.toBase58(),
    metadata: {
      description: 'A test casino',
      games: ['slots' as const, 'roulette' as const],
      logo: 'https://testcasino.com/logo.png',
      banner: 'https://testcasino.com/banner.png',
      socialLinks: {
        twitter: 'https://twitter.com/testcasino',
        discord: 'https://discord.gg/testcasino',
      },
      minBetAmount: 0.01,
      maxBetAmount: 100,
      supportedTokens: ['SOL', 'USDC'],
    },
    ...overrides,
  };

  const message = createSignatureMessage(data);
  const signature = signMessage(message, keypair);

  return {
    ...data,
    signature,
  };
}

/**
 * Create a signed heartbeat payload
 */
export function createSignedHeartbeat(
  casinoId: string,
  keypair: Keypair,
  overrides?: Partial<Omit<HeartbeatPayload, 'signature' | 'casinoId'>>
): HeartbeatPayload {
  const data = {
    casinoId,
    status: 'online' as const,
    timestamp: Date.now(),
    metrics: {
      activePlayers: 100,
      totalBets24h: 5000,
      uptime: 3600,
      responseTime: 50,
    },
    ...overrides,
  };

  const message = createSignatureMessage(data);
  const signature = signMessage(message, keypair);

  return {
    ...data,
    signature,
  };
}

/**
 * Create a signed update request
 */
export function createSignedUpdate(
  casinoId: string,
  keypair: Keypair,
  overrides?: Partial<Omit<CasinoUpdateRequest, 'signature' | 'casinoId'>>
): CasinoUpdateRequest {
  const data = {
    casinoId,
    ...overrides,
  };

  const message = createSignatureMessage(data);
  const signature = signMessage(message, keypair);

  return {
    ...data,
    signature,
  };
}

/**
 * Create a test Fastify app instance
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  return app;
}

/**
 * Make an API request to the test app
 */
export async function makeRequest<T = any>(
  app: FastifyInstance,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: any
): Promise<{
  statusCode: number;
  body: T;
}> {
  const response = await app.inject({
    method,
    url,
    payload: body,
  });

  return {
    statusCode: response.statusCode,
    body: JSON.parse(response.body),
  };
}

/**
 * Register a test casino and return its ID
 */
export async function registerTestCasino(
  app: FastifyInstance,
  keypair?: Keypair,
  overrides?: Partial<Omit<RegistrationRequest, 'signature'>>
): Promise<{ casinoId: string; keypair: Keypair }> {
  const testKeypair = keypair || createTestKeypair();
  const registration = createSignedRegistration(testKeypair, overrides);

  const response = await makeRequest(app, 'POST', '/api/casinos/register', registration);

  if (response.statusCode !== 201 || !response.body.success) {
    throw new Error(`Failed to register casino: ${JSON.stringify(response.body)}`);
  }

  return {
    casinoId: response.body.data.id,
    keypair: testKeypair,
  };
}

