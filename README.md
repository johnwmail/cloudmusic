# go-music - Cloudflare Edition

[![Original Go Version](https://img.shields.io/badge/Original-Go-blue.svg)](https://github.com/johnwmail/go-music)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A serverless music browser and streaming API migrated from Go to **Cloudflare Workers**. Browse, search, and stream music files stored in **Cloudflare R2** with a beautiful web interface.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Development](#development)
- [Migration from Go](#migration-from-go)

<a id="overview"></a>
## Overview

This is a TypeScript migration of the original [go-music](https://github.com/johnwmail/go-music) project, designed to run on Cloudflare's edge network:

- **Cloudflare Workers** - Backend API & Frontend static hosting (replaces Go + AWS Lambda)
- **Cloudflare R2** - Object storage (replaces AWS S3)

### Key Benefits
- ✅ **No egress fees** - R2 has zero egress fees (unlike S3)
- ✅ **Global edge** - Workers run on 300+ Cloudflare locations
- ✅ **100K requests/day free** - Generous free tier
- ✅ **10GB storage free** - R2 free tier
- ✅ **Faster cold starts** - Workers vs Lambda

<a id="architecture"></a>
## Architecture

```
┌──────────────────────┐
│  Cloudflare Worker   │
│  - Hono Router       │
│  - Serves index.html │
│  - Serves script.js  │
│  - Serves style.css  │
│  - POST /api         │
│  - GET /audio/*      │
└──────────┬───────────┘
           │
           ▼
 ┌─────────────────────┐
 │  Cloudflare R2      │
 │  - Music files      │
 │  - S3-compatible    │
 └─────────────────────┘
```

<a id="quick-start"></a>
## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)

### Local Development

```bash
# Clone and install
git clone https://github.com/johnwmail/go-music.git
cd go-music
npm install

# Login to Cloudflare
wrangler login

# Create R2 bucket
wrangler r2 bucket create music-bucket

# Upload some music files
wrangler r2 object put music-bucket "Rock/song.mp3" --file ./song.mp3

# Run locally
npm run dev
```

Visit http://localhost:8787

<a id="deployment"></a>
## ☁️ Deployment

### Deploy Worker (Backend & Frontend)

```bash
# Deploy to staging
npm run deploy

# Deploy to production
wrangler deploy --env production
```

GitHub Actions also runs CI on pushes and pull requests, and deploys tagged releases (`v*`) to the Cloudflare production environment.

### Environment Variables

Set via `wrangler.toml` or Cloudflare dashboard:

```bash
# No direct R2 credentials typically needed for R2 bindings.
# Worker accesses R2 via `env.MUSIC_BUCKET`.
```

<a id="configuration"></a>
## ⚙️ Configuration

### wrangler.toml

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MUSIC_BUCKET` | Yes | - | R2 bucket binding name |
| `S3_PREFIX` | No | `""` | Prefix path in R2 (e.g., "music/") |
| `MIN_SEARCH_STR` | No | `1` | Minimum characters for search |
| `MAX_SEARCH_RESULT` | No | `100` | Maximum search results |

### Supported Audio Formats

- `.mp3`
- `.wav`
- `.ogg`
- `.mp4`

### R2 Bucket Setup

Your R2 bucket should contain audio files organized in directories:

```
music-bucket/
├── Rock/
│   ├── song1.mp3
│   └── song2.mp3
├── Jazz/
│   └── tune.mp3
└── Classical/
    └── symphony.wav
```

<a id="api-endpoints"></a>
## 📋 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serves the web UI (Worker) |
| GET | `/static/*` | Serves static assets (Worker) |
| POST | `/api` | Main API endpoint |
| GET | `/audio/*path` | Streams audio from R2 |

### API Functions (POST to `/api`)

```bash
# Directory listing
curl -X POST http://localhost:8787/api 
  -H "Content-Type: application/json" 
  -d '{"function":"dir","data":"Rock/"}'

# Search by title
curl -X POST http://localhost:8787/api 
  -H "Content-Type: application/json" 
  -d '{"function":"searchTitle","data":"love"}'

# Get all MP3s
curl -X POST http://localhost:8787/api 
  -H "Content-Type: application/json" 
  -d '{"function":"getAllMp3"}'
```

<a id="development"></a>
## 🔧 Development

```bash
# Install dependencies
npm install

# Build worker (bundles static assets)
npm run build

# Run locally (auto-builds on start)
npm run dev

# Run tests
npm test

# Run with watch mode
npm run test:watch

# Lint
npm run lint
```

The project uses an ESLint 9 flat config, so `npm run lint` works without extra flags.

### Project Structure

```
go-music/
├── src/
│   ├── worker-with-assets.ts   # Worker entry point (bundled)
│   ├── types.ts                # TypeScript types
│   ├── handlers/
│   │   ├── api.ts              # API request handlers
│   │   └── audio.ts            # Audio streaming handlers
│   ├── storage/
│   │   └── r2.ts               # R2 storage backend
│   └── utils/
│       └── helpers.ts          # Utility functions
├── static/                     # Original static assets (bundled into worker)
│   ├── style.css
│   ├── script.js
│   └── favicon.ico
├── scripts/
│   └── bundle.js               # Builds worker with inlined assets
├── dist/
│   └── worker.mjs              # Built worker (auto-generated)
├── wrangler.toml               # Cloudflare config
├── package.json
└── tsconfig.json
```

<a id="migration-from-go"></a>
## 🔄 Migration from Go

### What Changed

| Go | TypeScript/Cloudflare |
|----|----------------------|
| Gin framework | Hono router |
| AWS Lambda | Cloudflare Workers |
| AWS S3 | Cloudflare R2 |
| `html/template` | Worker-served HTML + build-time injection |
| Local filesystem | R2-only (Workers have no FS) |
| Pre-signed S3 URLs | R2 direct streaming |

### What Stayed the Same

- ✅ All API endpoints compatible
- ✅ Frontend logic unchanged (just TS conversion)
- ✅ Search functionality
- ✅ Directory browsing
- ✅ Playlist management (cookies)
- ✅ XSS protection

### Not Supported in Cloudflare

- ❌ Local filesystem mode (Workers have no FS access)
- ❌ Go build-time ldflags (replaced with npm version)
- ❌ Distroless Docker (replaced with Workers)
