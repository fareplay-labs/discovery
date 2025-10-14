# FarePlay Discovery Service - Deployment Checklist

Use this checklist to ensure everything is set up correctly before deploying to production.

## ✅ Pre-Deployment Checklist

### Local Development
- [ ] Clone the repository
- [ ] Run `npm install` to install dependencies
- [ ] Create `.env` file from `.env.example`
- [ ] Start PostgreSQL with `docker-compose up -d postgres`
- [ ] Run `npm run prisma:generate` to generate Prisma Client
- [ ] Run `npm run prisma:migrate` to create database schema
- [ ] Start dev server with `npm run dev`
- [ ] Test health endpoint: `curl http://localhost:3000/health`
- [ ] Verify root endpoint: `curl http://localhost:3000/`

### Code Quality
- [ ] Run linter: `npm run lint` (fix any errors)
- [ ] Format code: `npm run format`
- [ ] Build TypeScript: `npm run build` (verify no errors)
- [ ] Check Prisma schema: `npx prisma validate`

### Docker Testing
- [ ] Build Docker image: `docker-compose build`
- [ ] Start full stack: `docker-compose up`
- [ ] Verify app is accessible on port 3000
- [ ] Check logs: `docker-compose logs -f app`
- [ ] Stop containers: `docker-compose down`

### Security Review
- [ ] Verify `.gitignore` excludes `.env` files
- [ ] Confirm no secrets in code or config files
- [ ] Check rate limiting is enabled
- [ ] Verify CORS settings are appropriate
- [ ] Review signature verification implementation

## 🚀 Fly.io Deployment

### Initial Setup
- [ ] Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
- [ ] Login: `fly auth login`
- [ ] Review `fly.toml` configuration
- [ ] Update `app` name in `fly.toml` if needed
- [ ] Choose primary region (default: `sjc`)

### Database Setup
- [ ] Create Postgres: `fly postgres create --name fareplay-discovery-db`
- [ ] Attach database: `fly postgres attach fareplay-discovery-db`
- [ ] Verify `DATABASE_URL` secret is set: `fly secrets list`

### Environment Variables
- [ ] Review required environment variables in `.env.example`
- [ ] Set production CORS origin (if not using `*`):
  ```bash
  fly secrets set CORS_ORIGIN="https://fareplay.io"
  ```
- [ ] Set heartbeat timeout if different from default:
  ```bash
  fly secrets set HEARTBEAT_TIMEOUT_MINUTES=10
  ```
- [ ] Set rate limits if needed:
  ```bash
  fly secrets set API_RATE_LIMIT=100 API_RATE_LIMIT_WINDOW=60000
  ```

### First Deployment
- [ ] Launch app: `fly launch --no-deploy`
- [ ] Review generated `fly.toml`
- [ ] Deploy: `fly deploy`
- [ ] Wait for deployment to complete
- [ ] Check status: `fly status`
- [ ] View logs: `fly logs`

### Verify Deployment
- [ ] Test health: `curl https://YOUR_APP.fly.dev/health`
- [ ] Test ready: `curl https://YOUR_APP.fly.dev/health/ready`
- [ ] Check root: `curl https://YOUR_APP.fly.dev/`
- [ ] Verify database connection in logs

## 🔍 Post-Deployment Verification

### API Functionality
- [ ] Test registration endpoint (with valid signature)
- [ ] Test heartbeat endpoint (with valid signature)
- [ ] Test casino list endpoint (no auth needed)
- [ ] Test casino stats endpoint
- [ ] Verify error responses have correct format

### Monitoring Setup
- [ ] Review application logs: `fly logs`
- [ ] Check for any errors or warnings
- [ ] Verify heartbeats are being processed
- [ ] Monitor database performance
- [ ] Set up log aggregation (optional)

### Performance
- [ ] Test response times
- [ ] Verify rate limiting works
- [ ] Check database query performance
- [ ] Monitor memory usage: `fly status`
- [ ] Review CPU usage

## 📊 Ongoing Maintenance

### Daily
- [ ] Check application logs for errors
- [ ] Monitor database size
- [ ] Review heartbeat success rate

### Weekly
- [ ] Review inactive casinos
- [ ] Check database performance
- [ ] Monitor API response times
- [ ] Review rate limit hits

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review and optimize database queries
- [ ] Check for Prisma updates
- [ ] Review security advisories
- [ ] Backup database

## 🛠️ Troubleshooting

### App Won't Start
1. Check logs: `fly logs`
2. Verify DATABASE_URL is set: `fly secrets list`
3. Check Prisma migrations: Look for migration errors in logs
4. Verify Docker build succeeded

### Database Connection Issues
1. Verify Postgres is attached: `fly postgres list`
2. Check DATABASE_URL format
3. Test connection: `fly postgres connect -a fareplay-discovery-db`
4. Review database logs

### Signature Verification Fails
1. Verify message format matches (JSON.stringify without signature)
2. Check Solana public key is valid base58
3. Verify signature is base58 encoded
4. Test with known working keypair

### Rate Limiting Issues
1. Check `API_RATE_LIMIT` setting
2. Review rate limit window (`API_RATE_LIMIT_WINDOW`)
3. Consider IP-based whitelisting for trusted services
4. Monitor rate limit hits in logs

## 🔐 Security Checklist

- [ ] All secrets stored in Fly secrets (not in code)
- [ ] DATABASE_URL is not exposed in logs
- [ ] CORS is properly configured
- [ ] Rate limiting is active
- [ ] Helmet security headers are enabled
- [ ] Signature verification is working
- [ ] No sensitive data in error messages
- [ ] HTTPS is enforced

## 📈 Scaling Checklist

When traffic increases:
- [ ] Monitor response times
- [ ] Check database connection pool
- [ ] Consider horizontal scaling: `fly scale count 2`
- [ ] Review rate limits
- [ ] Consider adding caching
- [ ] Monitor memory usage
- [ ] Optimize slow queries

## 🎯 Production Ready Criteria

Your service is production-ready when:
- ✅ All tests pass
- ✅ Docker build succeeds
- ✅ Health checks return 200
- ✅ Database migrations complete
- ✅ Signature verification works
- ✅ Rate limiting is active
- ✅ Logs are clean (no errors)
- ✅ Documentation is complete
- ✅ Monitoring is set up

## 📞 Emergency Contacts

If something goes wrong:
- **Fly.io Support**: https://fly.io/docs/about/support/
- **Database Issues**: Check Postgres logs
- **Application Issues**: Review app logs
- **Community Help**: Discord/GitHub Issues

---

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run prisma:studio         # Open database GUI
docker-compose up             # Start with Docker

# Deployment
fly deploy                    # Deploy to Fly.io
fly logs                      # View logs
fly status                    # Check status
fly ssh console              # SSH into instance

# Database
fly postgres connect         # Connect to database
npx prisma migrate deploy    # Run migrations
npx prisma studio            # Visual database editor

# Monitoring
fly logs -a YOUR_APP         # Tail logs
fly status                   # Check app status
fly metrics                  # View metrics
```

---

**Last Updated**: 2025-10-14  
**Service Version**: 1.0.0  
**Protocol Version**: 1.0.0

