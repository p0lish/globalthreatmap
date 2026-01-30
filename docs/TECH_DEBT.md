# Technical Debt

> Last updated: 2026-01-30

## Current Warnings

### Svelte 5 Deprecations

The codebase uses `<svelte:component>` which is deprecated in Svelte 5 runes mode. Components are now dynamic by default.

| File | Line | Fix |
|------|------|-----|
| `Sidebar.svelte` | 53, 80 | Replace `<svelte:component this={tab.icon}>` with `{@const Icon = tab.icon}<Icon />` |
| `EventCard.svelte` | 75 | Replace `<svelte:component this={CategoryIcon}>` with direct usage |
| `EntitySearch.svelte` | 243, 358 | Replace `<svelte:component this={TypeIcon}>` with direct usage |
| `WelcomeModal.svelte` | 95 | Replace `<svelte:component this={feature.icon}>` with direct usage |

### Reactivity Warning

| File | Line | Issue |
|------|------|-------|
| `ThreatMap.svelte` | 28 | `mapContainer` updated but not declared with `$state()` |

**Note**: The `mapContainer` warning is a false positive - it's a DOM binding that doesn't need reactive updates.

---

## Recent Changes

### Map Projection Switcher (2026-01-30)

Added globe/flat map toggle:
- `src/lib/stores/map.ts` - Added `projection` store and `toggleProjection()` function
- `src/lib/components/map/MapControls.svelte` - Added projection toggle button
- `src/lib/components/map/ThreatMap.svelte` - Added effect to update map projection

---

## TODO

- [ ] Fix `<svelte:component>` deprecation warnings
- [ ] Add input validation (Zod) to API routes
- [ ] Implement request caching/deduplication
- [ ] Add error tracking integration
- [ ] Add offline support with service worker
