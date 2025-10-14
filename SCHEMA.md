# FarePlay Discovery Service - Schema Documentation

This document describes the data models and schemas used by the Discovery Service.

## Database Schema

### Casino Model

Stores information about registered casinos.

```prisma
model Casino {
  id String @id @default(uuid())
  
  // Solana Identity
  publicKey String @unique // Solana public key in base58
  
  // Basic Info
  name   String
  url    String
  status String @default("online") // online, offline, maintenance, suspended
  
  // Metadata
  description      String?
  games            String[] // Array of game types
  logo             String?
  banner           String?
  
  // Social Links
  twitterUrl       String?
  discordUrl       String?
  telegramUrl      String?
  websiteUrl       String?
  
  // Bet Limits
  maxBetAmount     Float?
  minBetAmount     Float?
  supportedTokens  String[] @default(["SOL"])
  
  // Protocol Version
  version          String @default("1.0.0")
  
  // Timestamps
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  lastHeartbeat    DateTime?
  
  // Relations
  heartbeats Heartbeat[]
}
```

### Heartbeat Model

Stores heartbeat history for monitoring and analytics.

```prisma
model Heartbeat {
  id String @id @default(uuid())
  
  casinoId String
  casino   Casino @relation(fields: [casinoId], references: [id], onDelete: Cascade)
  
  // Status at time of heartbeat
  status String // online, offline, maintenance, suspended
  
  // Metrics
  activePlayers Int?
  totalBets24h  Float?
  uptime        Int? // In seconds
  responseTime  Float? // In milliseconds
  
  // Metadata
  timestamp DateTime @default(now())
  signature String
}
```

## API Schemas

All schemas are defined using Zod and match the @fareplay/sdk package.

### Casino Status

```typescript
type CasinoStatus = 
  | 'online'
  | 'offline'
  | 'maintenance'
  | 'suspended';
```

### Game Types

```typescript
type GameType =
  | 'slots'
  | 'roulette'
  | 'dice'
  | 'crash'
  | 'coinflip'
  | 'rps'
  | 'bombs'
  | 'cards';
```

### Registration Request

Used when registering a new casino.

```typescript
interface RegistrationRequest {
  name: string; // 1-100 characters
  url: string; // Valid URL
  publicKey: string; // Solana public key (base58, 32-44 chars)
  signature: string; // Solana signature in base58
  metadata: {
    description?: string; // Max 500 characters
    games?: GameType[]; // Default: []
    logo?: string; // Valid URL
    banner?: string; // Valid URL
    socialLinks?: {
      twitter?: string; // Valid URL
      discord?: string; // Valid URL
      telegram?: string; // Valid URL
      website?: string; // Valid URL
    };
    maxBetAmount?: number; // Positive number
    minBetAmount?: number; // Positive number
    supportedTokens?: string[]; // Default: ["SOL"]
  };
}
```

### Heartbeat Payload

Sent periodically to indicate casino is alive.

```typescript
interface HeartbeatPayload {
  casinoId: string; // UUID
  status: CasinoStatus;
  timestamp: number; // Unix timestamp (milliseconds)
  metrics?: {
    activePlayers?: number; // Non-negative integer
    totalBets24h?: number; // Non-negative number
    uptime?: number; // Seconds
    responseTime?: number; // Milliseconds
  };
  signature: string; // Solana signature in base58
}
```

### Casino Update Request

Update casino metadata.

```typescript
interface CasinoUpdateRequest {
  casinoId: string; // UUID
  name?: string; // 1-100 characters
  url?: string; // Valid URL
  status?: CasinoStatus;
  metadata?: {
    description?: string; // Max 500 characters
    games?: GameType[];
    logo?: string; // Valid URL
    banner?: string; // Valid URL
    socialLinks?: {
      twitter?: string;
      discord?: string;
      telegram?: string;
      website?: string;
    };
    maxBetAmount?: number;
    minBetAmount?: number;
    supportedTokens?: string[];
  };
  signature: string; // Solana signature in base58
}
```

### Casino Filters

Query parameters for listing casinos.

```typescript
interface CasinoFilters {
  status?: CasinoStatus;
  games?: GameType[];
  limit?: number; // 1-100, default: 20
  offset?: number; // Non-negative, default: 0
}
```

### Casino Metadata Response

The full casino object returned by the API.

```typescript
interface CasinoMetadata {
  id: string; // UUID
  name: string;
  url: string;
  publicKey: string; // Solana public key
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
  createdAt: number; // Unix timestamp (milliseconds)
  updatedAt: number; // Unix timestamp (milliseconds)
  lastHeartbeat?: number; // Unix timestamp (milliseconds)
  version: string; // Protocol version, e.g., "1.0.0"
}
```

## API Response Format

All API responses follow this standard format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number; // Unix timestamp (milliseconds)
}
```

### Success Response Example

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Casino",
    "status": "online"
  },
  "timestamp": 1697299200000
}
```

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "CASINO_NOT_FOUND",
    "message": "Casino not found"
  },
  "timestamp": 1697299200000
}
```

## Error Codes

All possible error codes:

- `INVALID_SIGNATURE` - Signature verification failed
- `CASINO_NOT_FOUND` - Casino not found in database
- `INVALID_REQUEST` - Invalid request format or missing fields
- `UNAUTHORIZED` - Unauthorized access attempt
- `RATE_LIMITED` - Too many requests from client
- `INTERNAL_ERROR` - Server internal error
- `CASINO_ALREADY_EXISTS` - Casino with this public key already registered
- `VALIDATION_ERROR` - Request validation failed (check details)

## Signature Verification

All write operations (register, heartbeat, update) require signature verification:

1. **Create Message**: JSON stringify the request body without the `signature` field
2. **Sign Message**: Use Solana wallet to sign the message bytes
3. **Encode Signature**: Encode signature as base58 string
4. **Send Request**: Include signature in request body

Example signing code:

```typescript
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Your keypair
const keypair = Keypair.fromSecretKey(secretKeyBytes);

// Request data (without signature)
const requestData = {
  name: "My Casino",
  url: "https://mycasino.com",
  publicKey: keypair.publicKey.toBase58(),
  metadata: { /* ... */ }
};

// Create message
const message = JSON.stringify(requestData);
const messageBytes = new TextEncoder().encode(message);

// Sign message
const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
const signature = bs58.encode(signatureBytes);

// Add signature to request
const finalRequest = {
  ...requestData,
  signature
};

// Send to API
await fetch('/api/casinos/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(finalRequest)
});
```

## Database Indexes

The following indexes are created for optimal query performance:

### Casino Table
- `publicKey` (unique)
- `status`
- `lastHeartbeat`

### Heartbeat Table
- `casinoId`
- `timestamp`

## Data Retention

- **Casinos**: Stored indefinitely
- **Heartbeats**: Stored indefinitely (can be pruned based on business requirements)
- **Inactive Casinos**: Marked as `offline` after 10 minutes (configurable) of no heartbeat

## Migration Strategy

When making schema changes:

1. Create a new migration: `npx prisma migrate dev --name description`
2. Test migration in development
3. Deploy to production: `npx prisma migrate deploy`

The Prisma schema is the source of truth. Never manually edit the database schema.

