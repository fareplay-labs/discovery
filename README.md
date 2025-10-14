# FarePlay Discovery Service

The Discovery Service (`discover.fareplay.io`) is the registry and metadata hub for all casinos built on the Fare Protocol. It provides APIs for casinos to register themselves, send heartbeat pings, and update operational metadata, enabling FarePlay to visualize the decentralized network.

## 🎯 Features

- **Casino Registration**: Register new casinos with Solana wallet verification
- **Heartbeat Tracking**: Monitor live casino statistics and uptime
- **Metadata Management**: Update casino information (name, description, games, branding)
- **Public Discovery API**: Query and browse the casino network with filtering
- **Signature Verification**: Solana wallet signature verification for all write operations
- **Auto-Cleanup**: Automatic marking of offline casinos
- **Protocol v1.0.0**: Fully compatible with @fareplay/sdk

## 🏗️ Architecture

- **Framework**: Fastify (high-performance Node.js web framework)
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Solana (signature verification with nacl/tweetnacl)
- **Deployment**: Docker + Fly.io
- **Language**: TypeScript
- **Authentication**: Solana wallet signature verification

## 📦 Installation

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (if running locally without Docker)

### Local Development Setup

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your database URL and configuration
```

3. **Start PostgreSQL with Docker Compose**:
```bash
docker-compose up -d postgres
```

4. **Run database migrations**:
```bash
npm run prisma:migrate
npm run prisma:generate
```

5. **Start the development server**:
```bash
npm run dev
```

The server will start at `http://localhost:3000`

## 🐳 Docker Deployment

### Build and run with Docker Compose

```bash
docker-compose up --build
```

This will start both the PostgreSQL database and the application.

### Build Docker image only

```bash
npm run docker:build
```

## 🚀 Fly.io Deployment

### Initial Setup

1. **Install Fly CLI**:
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login to Fly**:
```bash
fly auth login
```

3. **Create the app**:
```bash
fly launch --no-deploy
```

4. **Create a PostgreSQL database**:
```bash
fly postgres create --name fareplay-discovery-db
fly postgres attach fareplay-discovery-db
```

5. **Deploy**:
```bash
fly deploy
```

### Subsequent Deployments

```bash
fly deploy
```

### View logs

```bash
fly logs
```

## 📚 API Documentation

### Base URL

- Development: `http://localhost:3000`
- Production: `https://discover.fareplay.io`

### Response Format

All API responses follow the SDK `ApiResponse` format:

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number; // Unix timestamp in milliseconds
}
```

### Error Codes

- `INVALID_SIGNATURE` - Signature verification failed
- `CASINO_NOT_FOUND` - Casino not found
- `INVALID_REQUEST` - Invalid request format
- `UNAUTHORIZED` - Unauthorized access
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error
- `CASINO_ALREADY_EXISTS` - Casino already registered
- `VALIDATION_ERROR` - Request validation failed

### Endpoints

#### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks DB)
- `GET /health/live` - Liveness probe

#### Casino Management

- `POST /api/casinos/register` - Register a new casino
- `POST /api/casinos/heartbeat` - Send casino heartbeat
- `PATCH /api/casinos` - Update casino metadata
- `GET /api/casinos` - List casinos (with filters)
- `GET /api/casinos/:id` - Get casino by ID
- `GET /api/casinos/by-key/:publicKey` - Get casino by public key
- `GET /api/casinos/stats` - Get network statistics

### Authentication

All write operations require Solana signature verification:

1. Create a message by JSON stringifying the request data (excluding signature)
2. Sign the message with your Solana wallet
3. Include the `signature` field in the request body

Example (TypeScript with @solana/web3.js):

```typescript
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const keypair = Keypair.fromSecretKey(/* your secret key */);

// Registration data
const registrationData = {
  name: "My Casino",
  url: "https://mycasino.com",
  publicKey: keypair.publicKey.toBase58(),
  metadata: {
    description: "A great casino",
    games: ["slots", "roulette"],
    logo: "https://mycasino.com/logo.png",
    supportedTokens: ["SOL"]
  }
};

// Create message and sign it
const message = JSON.stringify(registrationData);
const messageBytes = new TextEncoder().encode(message);
const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
const signature = bs58.encode(signatureBytes);

// Send request
await fetch('https://discover.fareplay.io/api/casinos/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...registrationData,
    signature
  })
});
```

### Example Requests

#### Register Casino

```bash
curl -X POST https://discover.fareplay.io/api/casinos/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Casino",
    "url": "https://mycasino.com",
    "publicKey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "signature": "...",
    "metadata": {
      "description": "A great casino on Solana",
      "games": ["slots", "roulette", "dice"],
      "logo": "https://mycasino.com/logo.png",
      "banner": "https://mycasino.com/banner.png",
      "socialLinks": {
        "twitter": "https://twitter.com/mycasino",
        "discord": "https://discord.gg/mycasino"
      },
      "minBetAmount": 0.01,
      "maxBetAmount": 100,
      "supportedTokens": ["SOL", "USDC"]
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Casino",
    "url": "https://mycasino.com",
    "publicKey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "status": "online",
    "metadata": {
      "description": "A great casino on Solana",
      "games": ["slots", "roulette", "dice"],
      "logo": "https://mycasino.com/logo.png",
      "banner": "https://mycasino.com/banner.png",
      "socialLinks": {
        "twitter": "https://twitter.com/mycasino",
        "discord": "https://discord.gg/mycasino"
      },
      "minBetAmount": 0.01,
      "maxBetAmount": 100,
      "supportedTokens": ["SOL", "USDC"]
    },
    "createdAt": 1697299200000,
    "updatedAt": 1697299200000,
    "version": "1.0.0"
  },
  "timestamp": 1697299200000
}
```

#### Send Heartbeat

```bash
curl -X POST https://discover.fareplay.io/api/casinos/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "casinoId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "online",
    "timestamp": 1697299200000,
    "metrics": {
      "activePlayers": 150,
      "totalBets24h": 50000,
      "uptime": 86400,
      "responseTime": 120
    },
    "signature": "..."
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "success": true,
    "timestamp": 1697299200000,
    "nextHeartbeatIn": 60
  },
  "timestamp": 1697299200000
}
```

#### List Casinos

```bash
# Basic list
curl "https://discover.fareplay.io/api/casinos?limit=20&offset=0"

# Filter by status
curl "https://discover.fareplay.io/api/casinos?status=online&limit=20"

# Filter by games
curl "https://discover.fareplay.io/api/casinos?games=slots&games=roulette&limit=20"
```

Response:
```json
{
  "success": true,
  "data": {
    "casinos": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "My Casino",
        "url": "https://mycasino.com",
        "publicKey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "status": "online",
        "metadata": { /* ... */ },
        "createdAt": 1697299200000,
        "updatedAt": 1697299200000,
        "lastHeartbeat": 1697299200000,
        "version": "1.0.0"
      }
    ],
    "total": 42,
    "limit": 20,
    "offset": 0
  },
  "timestamp": 1697299200000
}
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript for production
- `npm start` - Run production build
- `npm test` - Run all tests (62 tests with SDK validation)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Database Management

View and manage data with Prisma Studio:
```bash
npm run prisma:studio
```

Create a new migration:
```bash
npx prisma migrate dev --name your_migration_name
```

## 🔒 Security

- All write operations require Solana signature verification
- Rate limiting on all endpoints (configurable)
- CORS protection
- Helmet.js security headers
- Signature message validation
- Trust proxy headers for accurate rate limiting

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `API_RATE_LIMIT` | Max requests per window | `100` |
| `API_RATE_LIMIT_WINDOW` | Rate limit window (ms) | `60000` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `HEARTBEAT_TIMEOUT_MINUTES` | Minutes before marking offline | `10` |

## 📊 Monitoring

The service includes:
- Health check endpoints for liveness/readiness probes
- Structured logging with Pino
- Background job to mark offline casinos
- Database connection health checks

## 🤝 Integration

This service is designed to work with:
- **FarePlay Casino Backends**: For registration and heartbeat
- **@fareplay/sdk**: NPM package for easy integration
- **FarePlay Frontend**: For displaying casino network
- **Solana Wallets**: For signature verification

## 📝 License

MIT

## 🙋 Support

For issues and questions:
- GitHub Issues: [https://github.com/fareplay/discovery/issues](https://github.com/fareplay/discovery/issues)
- Discord: [https://discord.gg/fareplay](https://discord.gg/fareplay)
