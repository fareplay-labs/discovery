# Integration Guide - FarePlay Discovery Service

This guide shows how to integrate your casino with the FarePlay Discovery Service using the @fareplay/sdk.

## Installation

```bash
npm install @fareplay/sdk @solana/web3.js tweetnacl bs58
```

## Quick Start

### 1. Initialize Your Casino Keypair

```typescript
import { Keypair } from '@solana/web3.js';

// Generate a new keypair (do this once and save securely)
const keypair = Keypair.generate();

// Or load from secret key
const keypair = Keypair.fromSecretKey(yourSecretKeyBytes);

console.log('Public Key:', keypair.publicKey.toBase58());
```

### 2. Create Signature Helper

```typescript
import nacl from 'tweetnacl';
import bs58 from 'bs58';

function signMessage(message: string, keypair: Keypair): string {
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(signatureBytes);
}
```

### 3. Register Your Casino

```typescript
const registrationData = {
  name: "Awesome Slots Casino",
  url: "https://awesomeslots.io",
  publicKey: keypair.publicKey.toBase58(),
  metadata: {
    description: "The best slots casino on Solana",
    games: ["slots", "roulette", "dice"],
    logo: "https://awesomeslots.io/logo.png",
    banner: "https://awesomeslots.io/banner.png",
    socialLinks: {
      twitter: "https://twitter.com/awesomeslots",
      discord: "https://discord.gg/awesomeslots",
    },
    minBetAmount: 0.01,
    maxBetAmount: 100,
    supportedTokens: ["SOL", "USDC"],
  },
};

// Sign the data
const message = JSON.stringify(registrationData);
const signature = signMessage(message, keypair);

// Register with Discovery Service
const response = await fetch('https://discover.fareplay.io/api/casinos/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...registrationData,
    signature,
  }),
});

const result = await response.json();
console.log('Registered casino:', result.data);

// Save the casino ID for future use
const casinoId = result.data.id;
```

### 4. Send Heartbeats

Set up a heartbeat every 60 seconds:

```typescript
async function sendHeartbeat(casinoId: string, keypair: Keypair) {
  const heartbeatData = {
    casinoId,
    status: 'online' as const,
    timestamp: Date.now(),
    metrics: {
      activePlayers: getActivePlayerCount(), // Your function
      totalBets24h: getTotalBets24h(), // Your function
      uptime: getUptimeSeconds(), // Your function
      responseTime: getAvgResponseTime(), // Your function
    },
  };

  const message = JSON.stringify(heartbeatData);
  const signature = signMessage(message, keypair);

  const response = await fetch('https://discover.fareplay.io/api/casinos/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...heartbeatData,
      signature,
    }),
  });

  const result = await response.json();
  console.log('Heartbeat sent:', result.success);
}

// Send heartbeat every 60 seconds
setInterval(() => sendHeartbeat(casinoId, keypair), 60000);
```

### 5. Update Casino Metadata

```typescript
async function updateCasino(casinoId: string, keypair: Keypair) {
  const updateData = {
    casinoId,
    name: "Awesome Slots Casino - Now with Dice!",
    metadata: {
      games: ["slots", "roulette", "dice", "crash"], // Added crash
      maxBetAmount: 200, // Increased limit
    },
  };

  const message = JSON.stringify(updateData);
  const signature = signMessage(message, keypair);

  const response = await fetch('https://discover.fareplay.io/api/casinos', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...updateData,
      signature,
    }),
  });

  const result = await response.json();
  console.log('Casino updated:', result.data);
}
```

## Complete Integration Example

Here's a complete class for casino integration:

```typescript
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export class DiscoveryClient {
  private baseUrl: string;
  private keypair: Keypair;
  private casinoId?: string;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(baseUrl: string, keypair: Keypair) {
    this.baseUrl = baseUrl;
    this.keypair = keypair;
  }

  private signMessage(message: string): string {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = nacl.sign.detached(messageBytes, this.keypair.secretKey);
    return bs58.encode(signatureBytes);
  }

  private async request<T>(
    path: string,
    method: string,
    data?: any
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  }

  async register(metadata: {
    name: string;
    url: string;
    description?: string;
    games?: string[];
    logo?: string;
    banner?: string;
    socialLinks?: any;
    minBetAmount?: number;
    maxBetAmount?: number;
    supportedTokens?: string[];
  }) {
    const registrationData = {
      name: metadata.name,
      url: metadata.url,
      publicKey: this.keypair.publicKey.toBase58(),
      metadata: {
        description: metadata.description,
        games: metadata.games || [],
        logo: metadata.logo,
        banner: metadata.banner,
        socialLinks: metadata.socialLinks,
        minBetAmount: metadata.minBetAmount,
        maxBetAmount: metadata.maxBetAmount,
        supportedTokens: metadata.supportedTokens || ['SOL'],
      },
    };

    const message = JSON.stringify(registrationData);
    const signature = this.signMessage(message);

    const result = await this.request('/api/casinos/register', 'POST', {
      ...registrationData,
      signature,
    });

    if (result.success && result.data) {
      this.casinoId = result.data.id;
    }

    return result;
  }

  async sendHeartbeat(metrics?: {
    activePlayers?: number;
    totalBets24h?: number;
    uptime?: number;
    responseTime?: number;
  }) {
    if (!this.casinoId) {
      throw new Error('Casino not registered. Call register() first.');
    }

    const heartbeatData = {
      casinoId: this.casinoId,
      status: 'online' as const,
      timestamp: Date.now(),
      metrics,
    };

    const message = JSON.stringify(heartbeatData);
    const signature = this.signMessage(message);

    return this.request('/api/casinos/heartbeat', 'POST', {
      ...heartbeatData,
      signature,
    });
  }

  async updateMetadata(updates: {
    name?: string;
    url?: string;
    status?: 'online' | 'offline' | 'maintenance' | 'suspended';
    metadata?: any;
  }) {
    if (!this.casinoId) {
      throw new Error('Casino not registered. Call register() first.');
    }

    const updateData = {
      casinoId: this.casinoId,
      ...updates,
    };

    const message = JSON.stringify(updateData);
    const signature = this.signMessage(message);

    return this.request('/api/casinos', 'PATCH', {
      ...updateData,
      signature,
    });
  }

  startHeartbeat(
    intervalSeconds: number = 60,
    getMetrics?: () => {
      activePlayers?: number;
      totalBets24h?: number;
      uptime?: number;
      responseTime?: number;
    }
  ) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const metrics = getMetrics ? getMetrics() : undefined;
        await this.sendHeartbeat(metrics);
        console.log('Heartbeat sent successfully');
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, intervalSeconds * 1000);

    console.log(`Heartbeat started (every ${intervalSeconds}s)`);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
      console.log('Heartbeat stopped');
    }
  }

  async getCasino(id: string) {
    return this.request(`/api/casinos/${id}`, 'GET');
  }

  async listCasinos(filters?: {
    status?: string;
    games?: string[];
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.games) filters.games.forEach((g) => params.append('games', g));
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return this.request(`/api/casinos${query ? `?${query}` : ''}`, 'GET');
  }
}
```

## Usage in Your Casino Backend

```typescript
import { Keypair } from '@solana/web3.js';
import { DiscoveryClient } from './discovery-client';

// Initialize
const keypair = Keypair.fromSecretKey(YOUR_SECRET_KEY);
const discovery = new DiscoveryClient('https://discover.fareplay.io', keypair);

// Register casino on startup
async function initializeCasino() {
  const result = await discovery.register({
    name: 'My Casino',
    url: 'https://mycasino.com',
    description: 'The best casino on Solana',
    games: ['slots', 'roulette'],
    logo: 'https://mycasino.com/logo.png',
    supportedTokens: ['SOL', 'USDC'],
    minBetAmount: 0.01,
    maxBetAmount: 100,
  });

  if (result.success) {
    console.log('Casino registered:', result.data.id);

    // Start automatic heartbeats
    discovery.startHeartbeat(60, () => ({
      activePlayers: getActivePlayerCount(),
      totalBets24h: getTotalBets24h(),
      uptime: process.uptime(),
      responseTime: getAvgResponseTime(),
    }));
  } else {
    console.error('Registration failed:', result.error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  discovery.stopHeartbeat();
  
  await discovery.updateMetadata({
    status: 'offline',
  });
  
  process.exit(0);
});

// Start
initializeCasino();
```

## Querying Casinos (Public API)

No authentication needed for read operations:

```typescript
// Get all online casinos
const response = await fetch(
  'https://discover.fareplay.io/api/casinos?status=online&limit=50'
);
const result = await response.json();
console.log('Online casinos:', result.data.casinos);

// Get casinos with specific games
const slotsResponse = await fetch(
  'https://discover.fareplay.io/api/casinos?games=slots&games=roulette'
);
const slotsResult = await slotsResponse.json();
console.log('Slots casinos:', slotsResult.data.casinos);

// Get network statistics
const statsResponse = await fetch('https://discover.fareplay.io/api/casinos/stats');
const stats = await statsResponse.json();
console.log('Network stats:', stats.data);
```

## Error Handling

```typescript
try {
  const result = await discovery.register({ /* ... */ });
  
  if (!result.success) {
    switch (result.error?.code) {
      case 'CASINO_ALREADY_EXISTS':
        console.log('Already registered, updating instead...');
        // Handle accordingly
        break;
      case 'INVALID_SIGNATURE':
        console.error('Signature verification failed');
        break;
      case 'VALIDATION_ERROR':
        console.error('Invalid data:', result.error.details);
        break;
      default:
        console.error('Error:', result.error?.message);
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Best Practices

1. **Secure Your Keypair**: Never commit your secret key to version control
2. **Use Environment Variables**: Store sensitive data in .env files
3. **Heartbeat Frequency**: Send heartbeats every 30-60 seconds
4. **Error Handling**: Always handle network and API errors
5. **Graceful Shutdown**: Update status to 'offline' when shutting down
6. **Rate Limiting**: Respect rate limits (100 requests/minute by default)
7. **Monitoring**: Log heartbeat successes and failures

## Testing

Test with the development server:

```typescript
const discovery = new DiscoveryClient(
  'http://localhost:3000',
  keypair
);
```

## Support

For integration help:
- Check the [Schema Documentation](SCHEMA.md)
- Read the [API Documentation](README.md)
- Join our [Discord](https://discord.gg/fareplay)

