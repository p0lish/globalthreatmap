# Development Guide

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run check` | Type check |

## Project Structure

```
src/
├── routes/                    # Pages and API endpoints
│   ├── +page.svelte          # Main page
│   ├── +layout.svelte        # App layout
│   └── api/                  # API routes (+server.ts)
└── lib/
    ├── components/           # Svelte components
    │   ├── ui/              # Base UI (Button, Card, etc.)
    │   ├── map/             # Map components
    │   ├── feed/            # Event feed
    │   ├── search/          # Entity search
    │   └── auth/            # Authentication
    ├── stores/              # Svelte stores
    ├── server/              # Server-only code
    └── types.ts             # Type definitions
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Required
MAPBOX_TOKEN=your_token
VITE_MAPBOX_TOKEN=your_token
VALYU_API_KEY=your_key

# Optional
APP_MODE=self-hosted
OPENAI_API_KEY=your_key
```

## Svelte 5 Patterns

### Props
```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
  }
  let { title, count = 0 }: Props = $props();
</script>
```

### State
```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

### Effects
```svelte
<script lang="ts">
  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

### Stores
```svelte
<script lang="ts">
  import { events } from '$lib/stores/events';
</script>

<p>Events: {$events.length}</p>
```

## Adding Components

```svelte
<!-- src/lib/components/MyComponent.svelte -->
<script lang="ts">
  interface Props {
    label: string;
  }
  let { label }: Props = $props();
</script>

<div>{label}</div>
```

## Adding API Routes

```typescript
// src/routes/api/example/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({ message: 'Hello' });
};
```

## Type Checking

```bash
npm run check
```

## Resources

- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/what-are-runes)
