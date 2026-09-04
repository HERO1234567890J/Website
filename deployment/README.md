# D-Trips — Deployment Guide (§22 / §32)

## Architecture

```
Internet → nginx (TLS) → frontend (nginx:80) → backend (NestJS:3001) → PostgreSQL
                                      ↕                    ↕
                              Static SPA            EasyCash / Resend / Bunny
```

## Prerequisites

- VPS with Docker + Docker Compose installed
- Domain DNS pointing to VPS IP
- SSH access for deploy user
- GitHub Actions secrets configured (see below)

## First Deploy

```bash
# 1. Clone the repo on the VPS
ssh deploy@your-vps
git clone https://github.com/your-org/d-trips.git /opt/d-trips
cd /opt/d-trips

# 2. Configure environment
cp .env.example .env
nano .env   # fill in all secrets

# 3. Start the stack
docker compose up -d --build

# 4. Verify health
curl http://localhost:3001/api/health
```

## Let's Encrypt (HTTPS)

```bash
# 1. Start nginx without TLS first (uncomment staging block in nginx config)
docker compose -f docker-compose.prod.yml up -d nginx

# 2. Obtain certificates
docker exec nginx certbot certonly --webroot \
  -w /var/www/certbot \
  -d your-domain.com \
  --email admin@your-domain.com \
  --agree-tos --no-eff-email

# 3. Switch to production TLS block in nginx config, then reload
docker exec nginx nginx -s reload

# 4. Set up auto-renewal cron (runs twice daily)
echo "0 0,12 * * * docker exec nginx certbot renew --quiet && docker exec nginx nginx -s reload" \
  | crontab -
```

## Database Migrations

Migrations run automatically on container start (backend Dockerfile CMD).

For manual migration:
```bash
docker compose exec backend npx prisma migrate deploy
```

## Backups

### Automated (cron)
```bash
# Runs daily at 2 AM, keeps 30 days
echo "0 2 * * * /opt/d-trips/deployment/scripts/backup.sh >> /var/log/dtrips-backup.log 2>&1" \
  | crontab -
```

### Manual backup
```bash
./deployment/scripts/backup.sh
```

### Restore
```bash
./deployment/scripts/restore.sh /opt/d-trips/backups/dtrips_20260903_020000.sql.gz
```

## Rollback Procedure

### Option A: Docker image rollback (code only)
```bash
cd /opt/d-trips

# List available images
docker images | grep d-trips

# Rollback to a specific image tag
docker compose down
# Edit docker-compose.yml to use the previous image tag
docker compose up -d
```

### Option B: Git rollback (full rollback)
```bash
cd /opt/d-trips

# Find the last good commit
git log --oneline -10

# Checkout the previous commit
git checkout <good-commit-hash>

# Rebuild and restart
docker compose down
docker compose up -d --build

# Run migrations if needed
docker compose exec backend npx prisma migrate deploy
```

### Option C: Database restore (data rollback)
```bash
# List available backups
ls -lh /opt/d-trips/backups/

# Restore from a specific backup
./deployment/scripts/restore.sh /opt/d-trips/backups/dtrips_YYYYMMDD_HHMMSS.sql.gz
```

## GitHub Actions Secrets

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_SSH_KEY` | Private SSH key for deploy user |
| `VPS_SSH_USER` | SSH username (default: `deploy`) |
| `DEPLOY_PATH` | Project path on VPS (default: `/opt/d-trips`) |

## Monitoring

- **Health check:** `GET /api/health` — returns DB status + uptime
- **Logs:** `docker compose logs -f backend`
- **Sentry:** configured via `SENTRY_DSN` env var

## Service Ports

| Service | Internal | External |
|---------|----------|----------|
| nginx (TLS) | 443 | 443 |
| frontend | 80 | via nginx |
| backend | 3001 | via nginx |
| PostgreSQL | 5432 | localhost only |
