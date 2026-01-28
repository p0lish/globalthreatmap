# Technical Debt & Issues

> Last updated: 2026-01-28

This document tracks identified technical debt, performance issues, and areas for improvement in the Global Threat Map codebase.

---

## Critical (Performance Killers)

### 1. No debouncing on search input
- **Location**: `components/feed/feed-filters.tsx`
- **Issue**: Every keystroke triggers `applyFilters()` on up to 1,000 events
- **Impact**: UI freezing and excessive CPU usage
- **Fix**: Add 300ms debounce to `setSearchQuery`

### 2. Full array re-computation on every filter change
- **Location**: `stores/events-store.ts:85-134`
- **Issue**: `applyFilters()` runs on every state change, sorting and filtering 1,000 events synchronously
- **Impact**: O(n) operations on every keystroke with no memoization between filter steps
- **Fix**: Debounce filter application, memoize intermediate results, or move to Web Worker

### 3. Sequential geocoding
- **Location**: `lib/geocoding.ts:494-499`
- **Issue**: Locations geocoded one-by-one with `await` in a for-loop
- **Impact**: 3 locations = 3 serial API calls instead of parallel
- **Fix**: Use `Promise.all()` for parallel API calls

### 4. Sequential event classification
- **Location**: `app/api/events/route.ts:41`
- **Issue**: OpenAI classification called for each event sequentially
- **Impact**: 30 events = 30 serial API calls to OpenAI
- **Fix**: Batch process or use `Promise.all()` with concurrency limit

---

## High Priority

### 5. Inefficient array operations in Zustand store
- **Location**: `stores/events-store.ts:46-56`
- **Issue**: `[event, ...state.events].slice(0, 1000)` copies entire array on every add
- **Impact**: O(n) memory allocation on each event addition
- **Fix**: Use immutable data structures or batch updates

### 6. Map callbacks not memoized
- **Location**: `components/map/threat-map.tsx:375-475`
- **Issue**: `handleMapClick` depends on `filteredEvents`, recreated on every filter change
- **Impact**: Excessive re-renders and potential memory leaks from event listeners
- **Fix**: Wrap with `useCallback` and stabilize dependencies

### 7. No request deduplication
- **Location**: Multiple API call sites
- **Issue**: Same geocoding/API requests can fire multiple times simultaneously
- **Impact**: Wasted API calls, rate limiting issues, unnecessary costs
- **Fix**: Implement SWR/React Query or custom request cache

### 8. Mapbox GeoJSON recomputes too often
- **Location**: `components/map/threat-map.tsx:310-330`
- **Issue**: `useMemo` depends on `filteredEvents` which changes constantly
- **Impact**: Map layer data updates trigger expensive Mapbox re-renders
- **Fix**: Debounce GeoJSON updates or use stable references

---

## Medium Priority

### 9. No input validation on API routes
- **Location**: `app/api/countries/conflicts/route.ts:8`
- **Issue**: `country` param passed directly to external API without sanitization
- **Impact**: Potential injection attacks on third-party APIs
- **Fix**: Add Zod validation or regex whitelist for country names

### 10. Mapbox token exposed in client
- **Location**: `components/map/threat-map.tsx:26`
- **Issue**: `NEXT_PUBLIC_MAPBOX_TOKEN` visible in browser network requests
- **Impact**: Token could be abused if extracted
- **Fix**: Proxy geocoding requests through backend API route

### 11. Potential memory leak in EventSource
- **Location**: `components/map/country-news-modal.tsx:133-236`
- **Issue**: EventSource may not close properly if component unmounts during streaming
- **Impact**: Memory leaks in long-running sessions
- **Fix**: Add cleanup in useEffect and abort controller

### 12. Magic numbers scattered throughout
- **Locations**:
  - `clusterRadius: 50` (threat-map.tsx:572)
  - `clusterMaxZoom: 14` (threat-map.tsx:571)
  - `CACHE_DURATION = 1000 * 60 * 60` (military-bases route)
  - `refreshInterval: 300000` (page.tsx)
- **Fix**: Move to centralized config file

### 13. Unused hospital layer code
- **Location**: `components/map/threat-map.tsx:155-202`
- **Issue**: Hospital data fetching and layer rendering implemented but disconnected
- **Impact**: Dead code, potential confusion
- **Fix**: Complete the feature or remove the code

---

## Low Priority

### 14. No code splitting for sidebar tabs
- **Location**: `components/sidebar.tsx`
- **Issue**: EntitySearch and EventFeed both load even when inactive tab
- **Impact**: Larger initial bundle size
- **Fix**: Use `next/dynamic` with `{ ssr: false }` for tab content

### 15. No error tracking integration
- **Location**: Global
- **Issue**: All errors only go to console.log
- **Impact**: No visibility into production errors
- **Fix**: Integrate Sentry or similar error tracking service

### 16. No skeleton loading states for main map
- **Location**: `components/map/threat-map.tsx`
- **Issue**: Only spinner shown during loading, poor perceived performance
- **Impact**: Users perceive app as slower than it is
- **Fix**: Add skeleton UI for map area and event markers

### 17. Inconsistent error handling patterns
- **Location**: Multiple files
- **Issue**: Some functions return `null`, others return `""`, others throw
- **Impact**: Unpredictable error handling, harder to debug
- **Fix**: Standardize on Result type or consistent error returns

### 18. No offline support
- **Location**: Global
- **Issue**: No service worker, no offline fallback UI
- **Impact**: App completely fails without network
- **Fix**: Add service worker with offline fallback page

---

## Quick Wins

| Fix | Effort | Impact | Location |
|-----|--------|--------|----------|
| Add 300ms debounce to search | 5 min | Very High | `feed-filters.tsx` |
| `Promise.all()` for geocoding | 10 min | High | `lib/geocoding.ts` |
| Add `useCallback` to map handlers | 15 min | Medium | `threat-map.tsx` |
| Extract magic numbers to config | 20 min | Low | Multiple files |
| Add Zod validation to country API | 10 min | Medium | `countries/conflicts/route.ts` |

---

## Architecture Notes

### Current Stack
- Next.js 16 (App Router)
- React 19.2.3
- Mapbox GL JS 3.18.0
- Zustand 5.0.10 (state management)
- OpenAI API (gpt-4.1-nano) for classification
- Valyu API for intelligence data

### Potential Future Improvements
- Migrate heavy filtering to Web Workers
- Implement virtual scrolling for event feed (1,000+ events)
- Add IndexedDB caching for search results
- Consider React Server Components for data fetching
- Move from OpenAI to local classification model to reduce costs
