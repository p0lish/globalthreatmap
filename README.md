# Global Threat Map

A real-time intelligence visualization platform for tracking Nipah virus outbreaks and health threats worldwide.

![Global Threat Map](https://4ealzrotsszllxtz.public.blob.vercel-storage.com/globalthreatmap)

## Features

### Core Features

- **Real-Time Event Mapping** - Plot breaking news events on a world map with color-coded threat levels
- **Interactive Mapbox Map** - Dark-themed map with clustering, heatmap visualization, and smooth navigation
- **Event Feed** - Real-time filterable feed of global events with category and threat level filters
- **Intel Dossiers** - Build intelligence dossiers on any actor with deep research reports, CSV data exports, and PowerPoint briefings

### Country Intelligence

Click on any country to view detailed Nipah virus intelligence:

- **Historical Cases** - Past outbreaks with dates, locations, and outcomes
- **Current Situation** - Ongoing cases, monitoring activities, and containment measures
- **AI-Powered Analysis** - Data synthesized using Valyu Answer API with cited sources

### Map Visualization

- **Auto-Pan Mode** - Play/pause button to automatically pan across the globe
- **Event Clustering** - Group nearby events for cleaner visualization at lower zoom levels
- **Heatmap View** - Toggle heatmap to visualize event density
- **Entity Locations** - When researching entities, their known locations appear as purple markers

## Tech Stack

- **Framework**: SvelteKit 2.50+ with Svelte 5 (Runes mode)
- **Styling**: Tailwind CSS 4
- **Maps**: Mapbox GL JS
- **AI Classification**: OpenAI (gpt-4.1-nano)
- **Intelligence Data**: Valyu API
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Mapbox account and API token
- Valyu API key

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Mapbox (required for maps)
MAPBOX_TOKEN=your_mapbox_token
VITE_MAPBOX_TOKEN=your_mapbox_token

# Valyu API (required for intelligence data)
VALYU_API_KEY=your_valyu_api_key

# App Mode (optional, defaults to self-hosted)
APP_MODE=self-hosted
VITE_APP_MODE=self-hosted
```

Optional variables:

```env
# OpenAI (for AI-powered classification)
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-nano

# OAuth (for valyu mode only)
VALYU_CLIENT_ID=your_client_id
VALYU_CLIENT_SECRET=your_client_secret
VALYU_AUTH_URL=https://auth.valyu.ai
```

Get your API keys:
- **Mapbox**: [Get a token](https://account.mapbox.com/access-tokens/)
- **Valyu**: [Get an API key](https://valyu.ai)
- **OpenAI** (optional): [Get an API key](https://platform.openai.com/api-keys)

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main map page
│   │   ├── +layout.svelte        # App layout
│   │   └── api/                  # API endpoints
│   │       ├── events/           # Event search
│   │       ├── entities/         # Entity research
│   │       ├── deepresearch/     # Deep research tasks
│   │       ├── countries/        # Country-specific data
│   │       ├── oauth/            # OAuth token exchange
│   │       └── valyu-proxy/      # OAuth proxy
│   └── lib/
│       ├── components/           # Svelte components
│       │   ├── ui/               # Base UI components
│       │   ├── map/              # Map components
│       │   ├── feed/             # Event feed
│       │   ├── search/           # Entity search
│       │   └── auth/             # Authentication
│       ├── stores/               # Svelte stores
│       ├── server/               # Server-only code
│       │   ├── valyu.ts          # Valyu SDK integration
│       │   ├── ai-classifier.ts  # OpenAI classification
│       │   ├── geocoding.ts      # Location extraction
│       │   └── oauth.ts          # OAuth utilities
│       └── types.ts              # Type definitions
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET/POST | Search for threat events |
| `/api/entities` | GET/POST | Entity research with streaming |
| `/api/deepresearch` | POST | Create deep research task |
| `/api/deepresearch/[taskId]` | GET | Poll task status |
| `/api/countries/conflicts` | GET | Country Nipah data with streaming |
| `/api/oauth/token` | POST | OAuth token exchange |
| `/api/valyu-proxy` | POST | OAuth proxy requests |

## Authentication

Global Threat Map supports two app modes controlled by the `APP_MODE` environment variable.

### App Modes

| Mode | Description |
|------|-------------|
| `self-hosted` | Default mode. No authentication required. Uses your Valyu API key. |
| `valyu` | OAuth mode. Users sign in with Valyu to access features. |

### Self-Hosted Mode (Default)

In self-hosted mode, the app runs entirely with your own Valyu API key:

```env
APP_MODE=self-hosted
VALYU_API_KEY=your_valyu_api_key
```

### Valyu OAuth Mode

In valyu mode, users authenticate with their Valyu accounts:

```env
APP_MODE=valyu
VALYU_CLIENT_ID=your_client_id
VALYU_CLIENT_SECRET=your_client_secret
VALYU_AUTH_URL=https://auth.valyu.ai
VALYU_APP_URL=https://platform.valyu.ai
REDIRECT_URI=http://localhost:5173/auth/callback
```

## Valyu Integration

This app uses [Valyu](https://valyu.ai) for intelligence data:

- **Search API** - Finding global events and news
- **Answer API** - Synthesizing Nipah virus intelligence
- **Deep Research** - Comprehensive entity analysis with deliverables

## License

MIT
