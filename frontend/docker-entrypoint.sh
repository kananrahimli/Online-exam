#!/bin/sh
set -e

echo "🚀 Frontend container başladı..."

# NODE_ENV yoxlanılır
NODE_ENV=${NODE_ENV:-development}

# node_modules yoxlanılır və yüklənir
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
  echo "📦 node_modules tapılmadı, yüklənir..."
  npm ci
  echo "✅ node_modules yükləndi"
else
  echo "✅ node_modules mövcuddur"
fi

# Development və ya Production moduna görə işləyir
if [ "$NODE_ENV" = "production" ]; then
  # Production: Build edilir və production server işə salınır
  if [ ! -d ".next" ] || [ -z "$(ls -A .next)" ]; then
    echo "🔨 Next.js build edilir (production)..."
    npm run build
    echo "✅ Build tamamlandı"
  else
    echo "✅ Build mövcuddur"
  fi
  echo "🎯 Production server işə salınır..."
  exec npm run start
else
  # Development: Build etmir, yalnız dev server işə salır
  echo "🔧 Development server işə salınır (hot reload aktivdir, build edilmir)..."
  exec npm run dev
fi

