# Deployment Guide - FarePlay Discovery Service

This guide walks you through deploying the FarePlay Discovery Service to Fly.io.

## Prerequisites

1. **Install Fly.io CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login to Fly.io**
   ```bash
   fly auth login
   ```

## Deployment Steps

### 1. Create Fly.io App (if not exists)

Check if the app exists:
```bash
fly apps list | grep fareplay-discovery
```

If it doesn't exist, create it:
```bash
fly apps create fareplay-discovery --org personal
```

### 2. Provision PostgreSQL Database

Create a Postgres cluster for the app:
```bash
fly postgres create --name fareplay-discovery-db --region sjc --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
```

Attach the database to your app:
```bash
fly postgres attach fareplay-discovery-db --app fareplay-discovery
```

This automatically sets the `DATABASE_URL` secret.

### 3. Deploy the Application

Deploy with:
```bash
fly deploy
```

The deployment will:
- Build the Docker image
- Run database migrations (`npx prisma migrate deploy`)
- Start the application
- Run health checks

### 4. Verify Deployment

Check app status:
```bash
fly status
```

View logs:
```bash
fly logs
```

Open the app:
```bash
fly open
```

Test the health endpoint:
```bash
curl https://fareplay-discovery.fly.dev/health
```

## Configuration

### Environment Variables

Current environment variables (set in `fly.toml`):
- `NODE_ENV=production`
- `PORT=8080`
- `HOST=0.0.0.0`
- `API_RATE_LIMIT=100`
- `API_RATE_LIMIT_WINDOW=60000`
- `HEARTBEAT_TIMEOUT_MINUTES=10`

To add/update secrets:
```bash
fly secrets set KEY=value
```

### Scaling

Scale the app:
```bash
# Scale VMs
fly scale count 2

# Scale VM resources
fly scale vm shared-cpu-2x --memory 1024
```

### Database Management

Access the database console:
```bash
fly postgres connect -a fareplay-discovery-db
```

Run migrations manually:
```bash
fly ssh console -a fareplay-discovery
npx prisma migrate deploy
```

## Monitoring

### View Logs
```bash
# Real-time logs
fly logs

# Last 200 lines
fly logs --lines 200
```

### Health Checks

The app has two health check endpoints:
- `/health/live` - Liveness check (app is running)
- `/health/ready` - Readiness check (app + database ready)

### Metrics
```bash
fly dashboard
```

## Troubleshooting

### App won't start
```bash
# Check logs
fly logs

# SSH into the machine
fly ssh console

# Check environment variables
fly secrets list
```

### Database connection issues
```bash
# Verify DATABASE_URL is set
fly secrets list

# Check database status
fly postgres db list -a fareplay-discovery-db

# Verify connection
fly ssh console
npx prisma migrate status
```

### Rebuild and deploy
```bash
fly deploy --no-cache
```

## Rollback

To rollback to a previous deployment:
```bash
# List releases
fly releases

# Rollback to specific version
fly releases rollback <version>
```

## Custom Domain (Optional)

Add a custom domain:
```bash
fly certs create discovery.fareplay.com
```

Then add a CNAME record:
```
discovery.fareplay.com CNAME fareplay-discovery.fly.dev
```

## CI/CD Integration

For automated deployments, generate a deploy token:
```bash
fly tokens create deploy -x 999999h
```

Add to GitHub Secrets as `FLY_API_TOKEN` and use the Fly.io GitHub Action.

## Cost Estimation

Current configuration:
- **App VM**: shared-cpu-1x with 512MB RAM = ~$2-3/month
- **PostgreSQL**: shared-cpu-1x with 1GB volume = ~$3-4/month
- **Total**: ~$5-7/month (with free tier credits may be $0)

## Support

- Fly.io Docs: https://fly.io/docs/
- Fly.io Community: https://community.fly.io/
- Project Issues: https://github.com/fareplay/discovery/issues

