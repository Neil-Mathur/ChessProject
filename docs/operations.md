# Operations Guide: Start, Stop & Maintenance

This guide covers running the application on an Ubuntu virtual server for production, plus local development on any OS.

---

## Prerequisites (Ubuntu VM, first-time setup)

```bash
# Node.js 20+ (recommended; app runs on 18 but 20 avoids engine warnings)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v   # should be v20.x.x
npm -v    # should be 10.x.x

# Clone the repo and install dependencies
git clone <your-repo-url> /opt/chess
cd /opt/chess
npm install

# Set up environment
cp .env.example .env
cp .env.example .env.local
nano .env.local    # fill in AUTH_SECRET, DATABASE_URL, and any optional vars

# Set up the database
npx prisma migrate deploy

# Build the app
npm run build
# or, if multiplayer is enabled:
# NEXT_PUBLIC_MULTIPLAYER=true npm run build
```

---

## Starting the application

### Without multiplayer (standard mode)

```bash
npm run build       # if not already built
npm start           # runs `next start` on port 3000
```

### With multiplayer enabled

Both env vars must be set before building (because `NEXT_PUBLIC_MULTIPLAYER` is inlined at build time):

```bash
# In .env.local:
# MULTIPLAYER=true
# NEXT_PUBLIC_MULTIPLAYER=true

npm run build            # builds Next.js with multiplayer UI enabled
npm run start:multi      # starts Next.js + Socket.IO on port 3000
```

Or equivalently, without editing the file:

```bash
NEXT_PUBLIC_MULTIPLAYER=true npm run build
MULTIPLAYER=true NEXT_PUBLIC_MULTIPLAYER=true npx tsx server.ts
```

### Changing port

```bash
PORT=8080 npm start
# or
PORT=8080 npm run start:multi
```

---

## Running with pm2 (recommended for production)

pm2 is a process manager that keeps the app running after crashes and across server reboots.

```bash
# Install pm2 globally
npm install -g pm2

# Start (without multiplayer)
pm2 start "npm start" --name chess

# Start (with multiplayer)
pm2 start "npm run start:multi" --name chess

# Save the process list so it survives a reboot
pm2 save
pm2 startup    # follow the printed command to enable auto-start
```

### Common pm2 commands

```bash
pm2 status              # show all processes
pm2 logs chess          # stream logs
pm2 logs chess --lines 200   # last 200 lines
pm2 restart chess       # restart the process
pm2 stop chess          # stop without removing
pm2 delete chess        # stop and remove from pm2 list
```

---

## Stopping the application

```bash
# If running directly (not pm2)
Ctrl+C

# If running via pm2
pm2 stop chess

# To stop and disable auto-start on reboot
pm2 stop chess
pm2 save
```

---

## Restarting after a code update

```bash
cd /opt/chess
git pull origin master

npm install               # if package.json changed

# Rebuild (always required for Next.js)
npm run build
# or if multiplayer is enabled:
# NEXT_PUBLIC_MULTIPLAYER=true npm run build

# Apply any new database migrations
npx prisma migrate deploy

pm2 restart chess
```

---

## Nginx reverse proxy (recommended)

Running Next.js behind Nginx allows you to use port 80/443, handle SSL, and serve multiple apps on one VM.

**Install nginx:**
```bash
sudo apt install nginx
```

**`/etc/nginx/sites-available/chess`:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";   # required for Socket.IO WebSocket
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

The `Upgrade` / `Connection "upgrade"` headers are required for Socket.IO's WebSocket transport to work through the proxy.

**Enable and reload:**
```bash
sudo ln -s /etc/nginx/sites-available/chess /etc/nginx/sites-enabled/
sudo nginx -t    # test config
sudo systemctl reload nginx
```

**SSL with Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

After adding SSL, update the Google OAuth redirect URI:
`https://yourdomain.com/api/auth/callback/google`

And set `HOSTNAME=127.0.0.1` in `.env.local` so the app only listens on localhost (Nginx handles the public interface).

---

## Development

### Standard local dev (no multiplayer)

```bash
npm run dev      # Next.js hot-reload on http://localhost:3000
```

### Local dev with multiplayer

```bash
npm run dev:multi   # starts server.ts + Socket.IO with hot-reload
```

### Run engine self-tests

```bash
npm run test:engine   # should print "ALL TESTS PASSED"
```

Run this after any change to `src/engine/`.

---

## Maintenance tasks

### Clearing the SQLite database (dev only)

```bash
rm prisma/dev.db
npx prisma migrate deploy   # recreates the schema
```

### Viewing the database

```bash
npx prisma studio    # opens a web UI on http://localhost:5555
```

### Checking disk space (important on small VMs)

The `.next/` build directory can be 100–200 MB. If disk space is tight:
```bash
# Check usage
df -h
du -sh .next/

# Remove old build before rebuilding
rm -rf .next
npm run build
```

### Updating dependencies

```bash
npm outdated          # see what is stale
npm update            # update within semver ranges

# After updating, always:
npm run test:engine   # verify engine still passes
npm run build         # verify build succeeds
```

**Do not upgrade Prisma to v7** without reading the migration guide first. v7 requires "driver adapters" — a breaking change that needs schema and config updates. See [postgres-migration.md](./postgres-migration.md) for the Prisma v6 production path.

### Log rotation

pm2 logs grow unbounded by default. Set up log rotation:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
```

---

## Environment file checklist

Before deploying to a new server, verify all required values are set in `.env.local`:

| Variable | Required | Check |
|---|---|---|
| `DATABASE_URL` | Yes | Points to Postgres connection string in production |
| `AUTH_SECRET` | Yes | Non-empty, at least 32 chars |
| `AUTH_URL` | Yes (behind proxy) | Set to `https://yourdomain.com` |
| `AUTH_TRUST_HOST` | Yes (behind proxy) | Set to `"true"` |
| `AUTH_GOOGLE_ID` | If Google login needed | Correct for the production domain |
| `AUTH_GOOGLE_SECRET` | If Google login needed | Matches the ID |
| `MULTIPLAYER` | If multiplayer enabled | `"true"` |
| `NEXT_PUBLIC_MULTIPLAYER` | If multiplayer enabled | `"true"` (requires rebuild) |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails: `Cannot find native binding` | Tailwind native binary missing (Windows only) | `npm install "@tailwindcss/oxide-win32-x64-msvc@<version>" --no-save` |
| `EPERM: operation not permitted, open '.next\trace'` | Dev server running during build | Stop the server first, then `rm -rf .next`, then rebuild |
| Sign-in button does nothing | Missing `AUTH_SECRET` or `AUTH_GOOGLE_*` | Check `.env.local` and restart |
| Socket.IO not connecting | `MULTIPLAYER` not set, or app started with `npm start` instead of `start:multi` | Check the start command and env vars |
| Online moves not applying | Client not reconnecting after server restart | Refresh the page; tokens in `sessionStorage` allow reconnection |
| `PrismaClientInitializationError` | Wrong `DATABASE_URL` format, or Postgres not reachable | Check the connection string; run `npx prisma db pull` to test |
