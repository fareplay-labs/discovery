# Testing Guide - FarePlay Discovery Service

This guide explains how to run and write tests for the Discovery Service.

## Test Suite Overview

The test suite validates complete SDK compatibility by:
1. **Importing actual SDK schemas** from `@fareplay/sdk`
2. **Validating requests** against SDK request schemas
3. **Validating responses** against SDK response schemas
4. **Testing integration** between Service and SDK
5. **End-to-end workflows** using SDK types

## Running Tests

### Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Run migrations (first time only)
npm run prisma:migrate

# 3. Run tests
npm test
```

### Test Commands

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Database Setup

**Simple approach**: We use ONE database for both development and testing.

- **Database**: `fareplay_discovery`
- **Isolation**: Each test clears data before running (via `beforeEach`)
- **No separate test DB**: Simpler, fewer moving parts

### Why One Database?

1. ✅ **Simpler** - No init scripts, no permission issues
2. ✅ **Faster** - No separate database to create
3. ✅ **Cleaner** - Tests clean up after themselves
4. ✅ **Standard** - How most Node.js apps test

### Setup Steps

```bash
# Start PostgreSQL
docker compose up -d postgres

# Wait for it to be ready (5-10 seconds)
sleep 5

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# You're ready!
npm test
```

## Test Structure

```
tests/
├── setup.ts                        # Global test setup & cleanup
├── utils/
│   └── testHelpers.ts             # Reusable test utilities
└── integration/
    ├── registration.test.ts       # Registration endpoint tests
    ├── heartbeat.test.ts          # Heartbeat endpoint tests
    ├── update.test.ts             # Update endpoint tests
    ├── discovery.test.ts          # Query/discovery endpoint tests
    ├── health.test.ts             # Health check endpoint tests
    └── sdk-validation.test.ts     # SDK compatibility tests (uses real SDK!)
```

## SDK Validation Tests

The most important test file is `sdk-validation.test.ts` which:

### Imports Real SDK Schemas

```typescript
import {
  CasinoMetadataSchema,
  RegistrationRequestSchema,
  HeartbeatPayloadSchema,
  ApiResponseSchema,
  ErrorCodes,
} from '@fareplay/sdk/src/schema';
```

### Validates Requests

```typescript
it('should accept request matching SDK schema', () => {
  const request = createRegistrationRequest();
  
  // Validate against actual SDK schema
  const result = RegistrationRequestSchema.safeParse(request);
  expect(result.success).toBe(true);
});
```

### Validates Responses

```typescript
it('should return response matching SDK schema', async () => {
  const response = await registerCasino();
  
  // Validate response against SDK CasinoMetadataSchema
  const result = CasinoMetadataSchema.safeParse(response.body.data);
  expect(result.success).toBe(true);
});
```

### Tests Complete Flows

```typescript
it('should complete register->heartbeat->update flow', async () => {
  // Each step validates request/response against SDK schemas
  const registration = await register(); // Validates with SDK
  const heartbeat = await sendHeartbeat(); // Validates with SDK  
  const update = await updateCasino(); // Validates with SDK
});
```

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, makeRequest } from '../utils/testHelpers';

describe('My Feature', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should do something', async () => {
    const response = await makeRequest(app, 'GET', '/some-endpoint');
    expect(response.statusCode).toBe(200);
  });
});
```

### Using SDK Schemas in Tests

```typescript
import { SomeSchema } from '@fareplay/sdk/src/schema';

it('should match SDK schema', () => {
  const data = { /* ... */ };
  
  // Validate against SDK
  const result = SomeSchema.safeParse(data);
  
  if (!result.success) {
    console.error('Validation errors:', result.error.errors);
  }
  
  expect(result.success).toBe(true);
});
```

### Test Helpers Available

```typescript
// Create test Solana keypair
const keypair = createTestKeypair();

// Sign a message
const signature = signMessage(message, keypair);

// Create signed registration
const registration = createSignedRegistration(keypair, overrides);

// Create signed heartbeat
const heartbeat = createSignedHeartbeat(casinoId, keypair, overrides);

// Create signed update
const update = createSignedUpdate(casinoId, keypair, overrides);

// Register a test casino (returns ID and keypair)
const { casinoId, keypair } = await registerTestCasino(app);

// Make API request
const response = await makeRequest(app, 'POST', '/api/endpoint', data);
```

## Continuous Integration

Tests run automatically on GitHub Actions for:
- Every push to `main` or `develop`
- Every pull request

### CI Pipeline Steps

1. Start PostgreSQL service
2. Install dependencies
3. Generate Prisma Client
4. Run migrations
5. Run tests
6. Upload coverage to Codecov

### Local CI Simulation

```bash
# Run exactly what CI runs
docker compose up -d postgres
sleep 5
npm ci
npm run prisma:generate
npm run prisma:migrate
npm test
```

## Test Isolation

Each test is isolated via:

1. **beforeEach cleanup** - Database cleared before each test
2. **Independent app instances** - Each test file creates its own Fastify instance
3. **Transaction-like behavior** - Tests don't interfere with each other

## Coverage Reports

```bash
# Generate coverage
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Debugging Tests

### Run Single Test File

```bash
npx vitest tests/integration/registration.test.ts
```

### Run Single Test

```bash
npx vitest -t "should register a new casino"
```

### Enable Debug Logging

```typescript
import { logger } from '../../src/utils/logger';

// In your test
logger.level = 'debug';
```

### Inspect Database During Tests

```bash
# Open Prisma Studio while tests run
npm run prisma:studio
```

## Common Issues

### Tests Fail: Database Connection

**Solution**: Start PostgreSQL
```bash
docker compose up -d postgres
sleep 5
```

### Tests Fail: Table Not Found

**Solution**: Run migrations
```bash
npm run prisma:migrate
```

### Can't Connect to Database

**Solution**: Check PostgreSQL is running and healthy
```bash
docker compose ps
docker compose logs postgres
```

### SDK Schema Validation Fails

**Solution**: Update SDK package
```bash
cd ../sdk && npm install
cd ../discovery && npm install
npm run prisma:generate
```

## Best Practices

1. **Always use SDK schemas** when testing compatibility
2. **Isolate tests** - each test should be independent
3. **Use test helpers** - don't duplicate setup code
4. **Clean up automatically** - database clears via beforeEach
5. **Descriptive names** - test names should explain what they test
6. **Test edge cases** - not just happy paths
7. **Validate responses** - check structure and values
8. **Check error cases** - test failure scenarios

## Running Tests Before Deployment

```bash
# Complete pre-deployment test checklist
docker compose up -d postgres
sleep 5
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run lint
npm run build
npm test
```

All tests must pass before deploying to production!

## Need Help?

- Check existing tests for examples
- Review test helpers in `tests/utils/testHelpers.ts`
- Look at SDK schemas in `../sdk/src/schema/`
- Ask in Discord: discord.gg/fareplay

---

**Remember**: The SDK validation tests ensure the Discovery Service and SDK work together perfectly. They use the REAL SDK schemas!
