#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Iwacuflix — one-command VPS deploy
#  Usage: bash deploy.sh
#  Requirements on VPS: nginx, pm2, mysql, node
# ─────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()     { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; exit 1; }

APP_DIR="$(cd "$(dirname "$0")" && pwd)"   # repo root = the app

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}         🎬  IWACUFLIX DEPLOY  🎬${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Prerequisites ─────────────────────────────────────────────
command -v node  >/dev/null 2>&1 || error "node not installed"
command -v npm   >/dev/null 2>&1 || error "npm not installed"
command -v pm2   >/dev/null 2>&1 || error "pm2 not installed  →  npm i -g pm2"
success "Node $(node -v) | npm $(npm -v) | pm2 $(pm2 -v)"

# ── .env.local check ─────────────────────────────────────────
if [ ! -f "$APP_DIR/.env.local" ]; then
  warn ".env.local not found — creating template"
  cat > "$APP_DIR/.env.local" << ENV
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@localhost:3306/iwacuflix"
JWT_SECRET=CHANGE_ME_LONG_RANDOM_STRING
ADMIN_EMAIL=admin@iwacuflix.com
ADMIN_PASSWORD=CHANGE_ME
NEXT_PUBLIC_API_URL=
ENV
  warn "Fill in $APP_DIR/.env.local then re-run: bash deploy.sh"
  exit 1
fi
success ".env.local ready"

# ── Install deps ──────────────────────────────────────────────
cd "$APP_DIR"
log "Installing dependencies..."
npm install
success "Dependencies installed"

# ── Prisma ────────────────────────────────────────────────────
log "Generating Prisma client..."
npx prisma generate
success "Prisma client generated"

log "Syncing database schema..."
npx prisma db push --accept-data-loss
success "Database schema synced"

# ── Uploads dir ───────────────────────────────────────────────
mkdir -p "$APP_DIR/public/uploads"
success "public/uploads/ ready"

# ── Build ─────────────────────────────────────────────────────
log "Building Next.js..."
npm run build
success "Build complete"

# ── Nginx ─────────────────────────────────────────────────────
if command -v nginx >/dev/null 2>&1 && [ -d /etc/nginx/sites-available ]; then
  log "Configuring Nginx..."
  sudo cp "$APP_DIR/nginx/iwacuflix.conf" /etc/nginx/sites-available/iwacuflix
  sudo ln -sf /etc/nginx/sites-available/iwacuflix /etc/nginx/sites-enabled/iwacuflix
  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    success "Nginx configured and reloaded"
  else
    warn "Nginx config test failed — edit nginx/iwacuflix.conf and set your domain"
  fi
fi

# ── SSL reminder ──────────────────────────────────────────────
echo ""
warn "No HTTPS yet? Run:"
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d yourdomain.com"
echo ""

# ── PM2 ───────────────────────────────────────────────────────
log "Starting / restarting PM2..."
if pm2 list | grep -q "iwacuflix"; then
  pm2 restart ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save

# Enable PM2 on reboot
pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null | grep "sudo" | bash 2>/dev/null || true

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🎉 Done! Iwacuflix is live.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
pm2 status
echo ""
echo -e "  Site    → ${BLUE}http://yourdomain.com${NC}"
echo -e "  Admin   → ${BLUE}http://yourdomain.com/admin${NC}"
echo -e "  Health  → ${BLUE}http://yourdomain.com/api/health${NC}"
echo -e "  Logs    → ${BLUE}pm2 logs iwacuflix${NC}"
echo ""
