#!/usr/bin/env bash

echo "📦 Installing backend dependencies..."
npm install --legacy-peer-deps

echo "🧱 Building frontend..."
npm install --prefix clients --legacy-peer-deps
npm run build --prefix clients

echo "✅ Build complete!"
