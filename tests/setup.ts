import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/db';

// Setup test environment
beforeAll(async () => {
  // Set test environment - use same database, just different NODE_ENV
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fareplay_discovery?schema=public';
  
  // Ensure schema exists (migrations should have run already via npm run prisma:migrate)
  try {
    await prisma.$connect();
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Failed to connect to database');
    console.error('Make sure to run: docker compose up -d postgres && npm run prisma:migrate');
    throw error;
  }
});

// Clean up database before each test for isolation
beforeEach(async () => {
  // Delete in correct order (respecting foreign keys)
  await prisma.heartbeat.deleteMany();
  await prisma.casino.deleteMany();
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

