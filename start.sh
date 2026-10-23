#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
if [ ! -d dist ]; then
  npm run build
fi
cd "$ROOT/backend"
export API_PORT="${API_PORT:-3001}"
export STATIC_DIR="$ROOT/frontend/dist"
node src/index.js
