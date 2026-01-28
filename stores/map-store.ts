import { create } from "zustand";
import type { MapViewport, GeoLocation } from "@/types";

interface EntityLocationMarker extends GeoLocation {
  entityName: string;
}

export interface NipahHospitalMarker {
  country: string;
  hospitalName: string;
  city: string;
  latitude: number;
  longitude: number;
  caseCount?: number;
  lastReported?: string;
  status: "active" | "contained" | "monitoring";
}

interface MapState {
  viewport: MapViewport;
  showHeatmap: boolean;
  showClusters: boolean;
  showWatchboxes: boolean;
  showHospitals: boolean;
  isDrawingWatchbox: boolean;
  activeWatchboxId: string | null;
  isAutoPlaying: boolean;
  entityLocations: EntityLocationMarker[];
  hospitals: NipahHospitalMarker[];
  hospitalsLoading: boolean;

  setViewport: (viewport: Partial<MapViewport>) => void;
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;
  toggleHeatmap: () => void;
  toggleClusters: () => void;
  toggleWatchboxes: () => void;
  toggleHospitals: () => void;
  startDrawingWatchbox: () => void;
  stopDrawingWatchbox: () => void;
  setActiveWatchbox: (id: string | null) => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;
  setEntityLocations: (entityName: string, locations: GeoLocation[]) => void;
  clearEntityLocations: () => void;
  setHospitals: (hospitals: NipahHospitalMarker[]) => void;
  setHospitalsLoading: (loading: boolean) => void;
}

const DEFAULT_VIEWPORT: MapViewport = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  bearing: 0,
  pitch: 0,
};

export const useMapStore = create<MapState>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  showHeatmap: false,
  showClusters: true,
  showWatchboxes: true,
  showHospitals: true,
  isDrawingWatchbox: false,
  activeWatchboxId: null,
  isAutoPlaying: false,
  entityLocations: [],
  hospitals: [],
  hospitalsLoading: false,

  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),

  flyTo: (longitude, latitude, zoom = 8) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        longitude,
        latitude,
        zoom,
      },
    })),

  toggleHeatmap: () =>
    set((state) => ({
      showHeatmap: !state.showHeatmap,
    })),

  toggleClusters: () =>
    set((state) => ({
      showClusters: !state.showClusters,
    })),

  toggleWatchboxes: () =>
    set((state) => ({
      showWatchboxes: !state.showWatchboxes,
    })),

  toggleHospitals: () =>
    set((state) => ({
      showHospitals: !state.showHospitals,
    })),

  startDrawingWatchbox: () => set({ isDrawingWatchbox: true }),

  stopDrawingWatchbox: () => set({ isDrawingWatchbox: false }),

  setActiveWatchbox: (id) => set({ activeWatchboxId: id }),

  startAutoPlay: () => set({ isAutoPlaying: true }),

  stopAutoPlay: () => set({ isAutoPlaying: false }),

  setEntityLocations: (entityName, locations) =>
    set({
      entityLocations: locations.map((loc) => ({
        ...loc,
        entityName,
      })),
    }),

  clearEntityLocations: () => set({ entityLocations: [] }),

  setHospitals: (hospitals) => set({ hospitals }),

  setHospitalsLoading: (loading) => set({ hospitalsLoading: loading }),
}));
