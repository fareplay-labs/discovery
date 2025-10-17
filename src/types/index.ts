import { z } from 'zod';

// Casino Status
export const CasinoStatusSchema = z.enum([
  'online',
  'offline',
  'maintenance',
  'suspended',
]);

export type CasinoStatus = z.infer<typeof CasinoStatusSchema>;

// Game Types
export const GameTypeSchema = z.enum([
  'slots',
  'roulette',
  'dice',
  'crash',
  'coinflip',
  'rps',
  'bombs',
  'cards',
  // Additional supported variants to match SDK/backends
  'coinFlip',
  'plinko',
  'cards_1',
  'slots_1',
  'cryptoLaunch',
  'cryptoLaunch_1',
]);

export type GameType = z.infer<typeof GameTypeSchema>;

// Registration Request (matches SDK)
export const RegistrationRequestSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  publicKey: z.string().min(32).max(44), // Solana public key in base58
  signature: z.string(),
  metadata: z.object({
    description: z.string().max(500).optional(),
    games: z.array(GameTypeSchema).default([]),
    logo: z.string().url().optional(),
    banner: z.string().url().optional(),
    socialLinks: z
      .object({
        twitter: z.string().url().optional(),
        discord: z.string().url().optional(),
        telegram: z.string().url().optional(),
        website: z.string().url().optional(),
      })
      .optional(),
    maxBetAmount: z.number().positive().optional(),
    minBetAmount: z.number().positive().optional(),
    supportedTokens: z.array(z.string()).default(['SOL']),
  }),
});

export type RegistrationRequest = z.infer<typeof RegistrationRequestSchema>;

// Heartbeat Payload (matches SDK)
export const HeartbeatPayloadSchema = z.object({
  casinoId: z.string().uuid(),
  status: CasinoStatusSchema,
  timestamp: z.number().int().positive(),
  metrics: z
    .object({
      activePlayers: z.number().int().nonnegative().optional(),
      totalBets24h: z.number().nonnegative().optional(),
      uptime: z.number().nonnegative().optional(), // In seconds
      responseTime: z.number().positive().optional(), // In milliseconds
    })
    .optional(),
  signature: z.string(),
});

export type HeartbeatPayload = z.infer<typeof HeartbeatPayloadSchema>;

// Casino Update Request (matches SDK)
export const CasinoUpdateRequestSchema = z.object({
  casinoId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  status: CasinoStatusSchema.optional(),
  metadata: z
    .object({
      description: z.string().max(500).optional(),
      games: z.array(GameTypeSchema).optional(),
      logo: z.string().url().optional(),
      banner: z.string().url().optional(),
      socialLinks: z
        .object({
          twitter: z.string().url().optional(),
          discord: z.string().url().optional(),
          telegram: z.string().url().optional(),
          website: z.string().url().optional(),
        })
        .optional(),
      maxBetAmount: z.number().positive().optional(),
      minBetAmount: z.number().positive().optional(),
      supportedTokens: z.array(z.string()).optional(),
    })
    .optional(),
  signature: z.string(),
});

export type CasinoUpdateRequest = z.infer<typeof CasinoUpdateRequestSchema>;

// Casino Filters (matches SDK)
export const CasinoFiltersSchema = z.object({
  status: CasinoStatusSchema.optional(),
  games: z.union([
    GameTypeSchema.transform(g => [g]), // Single value becomes array
    z.array(GameTypeSchema),
  ]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CasinoFilters = z.infer<typeof CasinoFiltersSchema>;

// Casino Metadata Response (matches SDK)
export interface CasinoMetadata {
  id: string;
  name: string;
  url: string;
  publicKey: string;
  status: CasinoStatus;
  metadata: {
    description?: string;
    games: GameType[];
    logo?: string;
    banner?: string;
    socialLinks?: {
      twitter?: string;
      discord?: string;
      telegram?: string;
      website?: string;
    };
    maxBetAmount?: number;
    minBetAmount?: number;
    supportedTokens: string[];
  };
  createdAt: number;
  updatedAt: number;
  lastHeartbeat?: number;
  version: string;
}

// API Response (matches SDK)
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
}

// Error Codes (matches SDK)
export const ErrorCodes = {
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  CASINO_NOT_FOUND: 'CASINO_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CASINO_ALREADY_EXISTS: 'CASINO_ALREADY_EXISTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

