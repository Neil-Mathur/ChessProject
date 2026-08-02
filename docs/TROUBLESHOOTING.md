# Troubleshooting Guide

## Database Issues

### SQLite Database Location Problem

**Issue:** Database file created in wrong location (`/prisma/dev.db` instead of project root)

**Root Cause:** Relative path in `DATABASE_URL` resolves differently depending on where Prisma CLI is executed from.

```bash
# WRONG - creates db in /prisma/dev.db
DATABASE_URL="file:./dev.db"

# CORRECT - creates db in project root
DATABASE_URL="file:/var/www/chessproject/dev.db"  # absolute path
```

**Fix:**
```bash
# Use absolute paths in .env and .env.local
echo 'DATABASE_URL="file:/var/www/chessproject/dev.db"' > .env

# If db is in wrong location, move it
mv /var/www/chessproject/prisma/dev.db /var/www/chessproject/dev.db

# Re-run migrations
npx prisma migrate deploy
```

**Prevention:** Always use absolute paths for SQLite DATABASE_URL in production.

---

### Empty Database (No Tables)

**Issue:** Database file exists but `sqlite3 dev.db ".tables"` returns nothing

**Root Cause:** Prisma migrations were never executed

**Fix:**
```bash
cd /var/www/chessproject

# Verify .env has correct DATABASE_URL
cat .env

# Run migrations to create tables
npx prisma migrate deploy

# Or push schema directly
npx prisma db push

# Verify tables exist
sqlite3 /var/www/chessproject/dev.db ".tables"
# Should show: Account Game Preferences Session User VerificationToken
```

**Debug migrations:**
```bash
# Check migration files exist
ls -la prisma/migrations/

# Run with verbose output
npx prisma migrate deploy --verbose

# Check if migrations table exists
sqlite3 dev.db "SELECT * FROM _prisma_migrations;"
```

---

### Querying SQLite Database

**Connect to database:**
```bash
sqlite3 /var/www/chessproject/dev.db
```

**Common queries:**
```sql
-- List all tables
.tables

-- Show table schema
.schema User

-- Count users
SELECT COUNT(*) FROM User;

-- List all users
SELECT id, name, email FROM User;

-- Show user preferences
SELECT u.email, p.variantId, p.boardThemeId FROM User u 
LEFT JOIN Preferences p ON u.id = p.userId;

-- Count games
SELECT COUNT(*) FROM Game;

-- Recent games (last 10)
SELECT * FROM Game ORDER BY createdAt DESC LIMIT 10;

-- Exit
.quit
```

**Backup database:**
```bash
cp /var/www/chessproject/dev.db /var/www/chessproject/dev.db.backup.$(date +%Y%m%d_%H%M%S)
```

---

## Build & Configuration Issues

### TypeScript Config Error

**Error:** `Configuring Next.js via 'next.config.ts' is not supported`

**Root Cause:** Next.js 15 requires JavaScript config, not TypeScript

**Fix:**
```bash
# Convert to JavaScript
rm next.config.ts
cat > next.config.js <<'EOF'
const nextConfig = {
  allowedDevOrigins: ["madchesslab.com", "www.madchesslab.com"],
};

export default nextConfig;
EOF

npm run build
```

**Note:** This broke in production but not dev. Dev server is more forgiving than production builds.

---

### NEXT_REDIRECT Error

**Error:** `Error: NEXT_REDIRECT` with digest `NEXT_REDIRECT;replace;/;307;`

**Root Cause:** `redirect()` function called in Client Component instead of Server Component

**File:** `src/app/play/[roomId]/page.tsx`

**Issue:**
```tsx
// WRONG - redirect() doesn't work in "use client"
"use client";
if (process.env.NEXT_PUBLIC_MULTIPLAYER !== "true") {
  redirect("/");  // ❌ Error in production
}
```

**Fix:**
```tsx
// CORRECT - use useRouter().replace() in useEffect
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PlayPage() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MULTIPLAYER !== "true") {
      router.replace("/");  // ✅ Works in production
    }
  }, [router]);

  if (process.env.NEXT_PUBLIC_MULTIPLAYER !== "true") {
    return null;
  }
  // ...
}
```

---

## Authentication Issues

### CSRF Token Missing

**Error:** `[auth][error] MissingCSRF: CSRF token was missing during an action signin`

**Root Causes:**
1. `AUTH_SECRET` missing or empty
2. `AUTH_URL` not set or incorrect (including trailing slash)
3. Domain/protocol mismatch between request and AUTH_URL
4. Missing `AUTH_TRUST_HOST` for reverse proxy

**Fix - Check .env.local:**
```bash
cat /var/www/chessproject/.env.local
```

Should contain:
```
DATABASE_URL="file:/var/www/chessproject/dev.db"
AUTH_SECRET="your-secret-here"
AUTH_URL="https://madchesslab.com"
AUTH_TRUST_HOST="true"
MULTIPLAYER="true"
NEXT_PUBLIC_MULTIPLAYER="true"
```

**Important:**
- `AUTH_SECRET` must be set (generate: `openssl rand -hex 32`)
- `AUTH_URL` must NOT have trailing slash
- `AUTH_URL` protocol must match how you access the app (http vs https)
- `AUTH_TRUST_HOST="true"` required for reverse proxy setups

**Rebuild after changes:**
```bash
npm run build
pm2 restart chessproject
```

---

## Deployment Issues

### App Works on Port 3000 but Not on Domain

**Symptom:** 
- `http://169.58.74.181:3000/` ✅ Works
- `https://madchesslab.com/` ❌ "Connection refused"

**Causes:**
1. Nginx not installed or running
2. Nginx config missing or wrong
3. Port 80/443 not open
4. DNS not propagated
5. SSL certificate not set up

**Diagnosis:**
```bash
# Check Nginx is running
sudo systemctl status nginx

# Check Nginx config is valid
sudo nginx -t

# Check port 80 is open
sudo netstat -tlnp | grep 80

# Test locally
curl http://localhost:3000     # Should work
curl http://madchesslab.com    # Test domain locally
curl https://madchesslab.com   # Test HTTPS (will fail if no SSL)

# Check DNS
nslookup madchesslab.com       # Should show server IP
```

**Fix - HTTP (test first):**
```bash
sudo tee /etc/nginx/sites-available/madchesslab.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name madchesslab.com www.madchesslab.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/madchesslab.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

**Add HTTPS (after HTTP works):**
```bash
# Get SSL certificate
sudo certbot certonly --nginx -d madchesslab.com -d www.madchesslab.com

# Update Nginx config with HTTPS
sudo tee /etc/nginx/sites-available/madchesslab.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name madchesslab.com www.madchesslab.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name madchesslab.com www.madchesslab.com;

    ssl_certificate /etc/letsencrypt/live/madchesslab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/madchesslab.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable certbot.timer
```

---

## Multiplayer Setup

### Enabling Multiplayer

**Requirements:**
1. Set environment variables
2. Rebuild (NEXT_PUBLIC_* are inlined at build time)
3. Use `npm run start:multi` instead of `npm run start`
4. Socket.IO server runs on same port as Next.js (3000)

**Steps:**
```bash
# 1. Update .env.local
cat > /var/www/chessproject/.env.local <<'EOF'
DATABASE_URL="file:/var/www/chessproject/dev.db"
AUTH_SECRET="your-secret"
AUTH_URL="https://madchesslab.com"
AUTH_TRUST_HOST="true"
MULTIPLAYER="true"
NEXT_PUBLIC_MULTIPLAYER="true"
EOF

# 2. Rebuild (required - NEXT_PUBLIC_* are inlined)
npm run build

# 3. Update PM2 config to use start:multi
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [
    {
      name: 'chessproject',
      script: 'npm',
      args: 'run start:multi',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        MULTIPLAYER: 'true',
        NEXT_PUBLIC_MULTIPLAYER: 'true'
      },
      out_file: '/var/log/chessproject.log',
      error_file: '/var/log/chessproject-error.log'
    }
  ]
};
EOF

# 4. Restart
pm2 restart chessproject

# 5. Test
# Open 2 browser windows to https://madchesslab.com/lobby
# Create room in one, join in other
```

**How it works:**
- `src/server.ts` is custom Next.js + Socket.IO server
- Runs on single port (3000 by default, proxied to domain via Nginx)
- `npm run start:multi` starts this custom server
- Offline games don't use Socket.IO (no overhead when MULTIPLAYER=false)

---

## Quick Health Check

```bash
#!/bin/bash
# Save as: /var/www/chessproject/health-check.sh

echo "=== App Status ==="
pm2 status

echo -e "\n=== Port 3000 ==="
curl -s http://localhost:3000 | head -20

echo -e "\n=== Port 80 (HTTP) ==="
curl -s -I http://madchesslab.com | head -5

echo -e "\n=== Port 443 (HTTPS) ==="
curl -s -I https://madchesslab.com | head -5

echo -e "\n=== Nginx Config ==="
sudo nginx -t

echo -e "\n=== Database ==="
sqlite3 /var/www/chessproject/dev.db "SELECT COUNT(*) as user_count FROM User; SELECT COUNT(*) as game_count FROM Game;"

echo -e "\n=== Logs (last 20 lines) ==="
pm2 logs chessproject --lines 20

# Run: bash health-check.sh
```

---

## Key Learnings

1. **Database Paths:** Always use absolute paths for SQLite in production
2. **Environment Variables:** NEXT_PUBLIC_* are inlined at build time — rebuild required after changes
3. **Auth.js:** Requires AUTH_SECRET, AUTH_URL (no trailing slash), and AUTH_TRUST_HOST for proxies
4. **Next.js 15:** Requires .js config, not .ts
5. **Server Components:** Use `redirect()` only in Server Components, use `useRouter().replace()` in Client Components
6. **Multiplayer:** Requires custom server.ts and npm run start:multi, not npm run start
7. **HTTPS:** Test HTTP first, then add SSL via Certbot + Nginx redirect
