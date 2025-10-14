# FarePlay Discovery Service - Quick Start Guide

This guide will get you up and running with the Discovery Service in under 5 minutes.

## Prerequisites

- Node.js 20+ installed
- Docker and Docker Compose installed

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Start Database

```bash
docker-compose up -d postgres
```

Wait a few seconds for PostgreSQL to start.

## Step 3: Run Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

When prompted for a migration name, enter: `init`

## Step 4: Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Step 5: Test It

### Check health:
```bash
curl http://localhost:3000/health
```

### View API info:
```bash
curl http://localhost:3000/
```

## What's Next?

- Read the [full README](README.md) for API documentation
- Check out the [SDK schemas](../sdk/src/schema/) to understand the data models
- Use Prisma Studio to view data: `npm run prisma:studio`

## Using with @fareplay/sdk

Install the SDK in your casino project:

```bash
npm install @fareplay/sdk
```

Then use it to interact with the Discovery Service:

```typescript
import { DiscoveryClient } from '@fareplay/sdk';

const client = new DiscoveryClient({
  baseUrl: 'http://localhost:3000',
});

// Register your casino
const casino = await client.register({
  name: 'My Casino',
  url: 'https://mycasino.com',
  publicKey: keypair.publicKey.toBase58(),
  signature: '...',
  metadata: {
    games: ['slots', 'roulette'],
    supportedTokens: ['SOL'],
  },
});

// Send heartbeat
await client.heartbeat({
  casinoId: casino.id,
  status: 'online',
  timestamp: Date.now(),
  metrics: {
    activePlayers: 100,
  },
  signature: '...',
});

// List casinos
const casinos = await client.listCasinos({
  limit: 20,
  offset: 0,
});
```

## Troubleshooting

### Database connection error

Make sure PostgreSQL is running:
```bash
docker-compose ps
```

If it's not running:
```bash
docker-compose up -d postgres
```

### Port already in use

Change the `PORT` in `.env`:
```bash
PORT=3001
```

### Reset database

```bash
docker-compose down -v
docker-compose up -d postgres
npm run prisma:migrate
```

## Development Tools

- **Prisma Studio** - Visual database browser
  ```bash
  npm run prisma:studio
  ```

- **View Logs** - Watch server logs
  ```bash
  npm run dev
  ```

- **Run Linter**
  ```bash
  npm run lint
  ```

- **Format Code**
  ```bash
  npm run format
  ```

## Production Deployment

See the [README](README.md#-flyio-deployment) for Fly.io deployment instructions.

