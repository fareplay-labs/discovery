# Getting Started with FarePlay Discovery Service

Welcome! This guide will help you get the Discovery Service running in minutes.

## 📋 What You'll Need

- Node.js 20 or higher
- Docker Desktop (for database)
- A code editor

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- Fastify (web framework)
- Prisma (database ORM)
- Solana libraries (signature verification)
- Zod (validation)
- And more...

### Step 2: Set Up Environment

The `.env` file is already configured for local development with Docker:

```bash
# .env is ready to use with these defaults:
DATABASE_URL="postgresql://fareplay:fareplay_dev_password@localhost:5432/fareplay_discovery?schema=public"
PORT=3000
NODE_ENV=development
```

### Step 3: Start PostgreSQL

```bash
docker-compose up -d postgres
```

This starts a PostgreSQL database in Docker. Wait ~5 seconds for it to initialize.

### Step 4: Set Up Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

When prompted for migration name, enter: `init`

### Step 5: Start the Server

```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 Server listening on http://0.0.0.0:3000
📚 API Documentation: http://0.0.0.0:3000/
```

### Step 6: Test It!

Open another terminal and run:

```bash
# Check health
curl http://localhost:3000/health

# View API info
curl http://localhost:3000/
```

You should see JSON responses with `"success": true`

## 🎉 You're Ready!

The Discovery Service is now running. Here's what you can do:

### View the Database
```bash
npm run prisma:studio
```
Opens a visual database browser at http://localhost:5555

### Test the API

The service is fully compatible with your SDK schemas:

```typescript
// Example: List all casinos
const response = await fetch('http://localhost:3000/api/casinos?limit=10');
const result = await response.json();
console.log(result.data);
```

### Next Steps

1. **Read the API Docs**: Check [README.md](README.md) for complete API documentation
2. **Integration Guide**: See [INTEGRATION.md](INTEGRATION.md) for casino integration examples
3. **Schema Reference**: Review [SCHEMA.md](SCHEMA.md) for data models
4. **Deploy to Production**: Follow [CHECKLIST.md](CHECKLIST.md) for deployment

## 📚 Important Files

- `README.md` - Complete documentation
- `QUICKSTART.md` - Condensed quick start
- `INTEGRATION.md` - Integration code examples
- `SCHEMA.md` - Data model reference
- `CHECKLIST.md` - Deployment checklist
- `PROJECT_SUMMARY.md` - Project overview

## 🐛 Troubleshooting

### PostgreSQL won't start
```bash
docker-compose down
docker-compose up -d postgres
```

### Port 3000 already in use
Edit `.env` and change `PORT=3001`

### Database connection error
Check PostgreSQL is running:
```bash
docker-compose ps
```

### Can't find module errors
Run `npm install` again

## 🔑 Key Features You Have

✅ **Casino Registration** - Solana signature verified  
✅ **Heartbeat Tracking** - Monitor casino uptime  
✅ **Public Discovery** - Query casinos with filters  
✅ **Auto Cleanup** - Offline detection  
✅ **SDK Compatible** - Matches @fareplay/sdk 100%  

## 📊 Explore the Data

After registering some casinos (see [INTEGRATION.md](INTEGRATION.md)):

```bash
# View in Prisma Studio
npm run prisma:studio

# Or query directly
curl http://localhost:3000/api/casinos?status=online
```

## 🚀 Deploy to Production

When ready for production:

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch --no-deploy
fly postgres create --name fareplay-discovery-db
fly postgres attach fareplay-discovery-db
fly deploy
```

See [CHECKLIST.md](CHECKLIST.md) for complete deployment guide.

## 💡 Tips

- Use `make dev` instead of `npm run dev` (requires make)
- Run `make` to see all available commands
- Check `docker-compose logs -f` to view container logs
- Use `fly logs` to view production logs

## 🤝 Need Help?

- **Discord**: discord.gg/fareplay
- **Issues**: GitHub Issues
- **Docs**: All .md files in this directory

---

**You're all set!** The Discovery Service is running and ready to accept casino registrations. 🎰

