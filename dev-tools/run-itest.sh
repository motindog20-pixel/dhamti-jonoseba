#!/usr/bin/env bash
# সার্ভারের আসল কোড (server/app.ts) ছোট স্টাব + SQLite-এর ওপর চালিয়ে ইন্টিগ্রেশন টেস্ট চালায়।
# ইন্টারনেট/npm install ছাড়াই চলে। প্রয়োজন: Node 22+ এবং tsx (বৈশ্বিকভাবে বা node_modules/.bin/tsx)।
# চালান: bash dev-tools/run-itest.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/src"
cp -r "$ROOT/server" "$ROOT/api" "$TMP/"
cp -r "$ROOT/src/services" "$ROOT/src/data" "$ROOT/src/types" "$TMP/src/"
cp -r "$ROOT/dev-tools/itest/stubs" "$TMP/node_modules"
cp "$ROOT/dev-tools/itest/integration.test.mjs" "$TMP/"
echo '{"type":"module"}' > "$TMP/package.json"
TSX="$(command -v tsx || echo "$ROOT/node_modules/.bin/tsx")"
cd "$TMP" && "$TSX" integration.test.mjs
