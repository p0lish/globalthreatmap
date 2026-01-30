import { writable } from 'svelte/store';
import type { MapViewport, GeoLocation } from '$lib/types';

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
	status: 'active' | 'contained' | 'monitoring';
}

const DEFAULT_VIEWPORT: MapViewport = {
	longitude: 0,
	latitude: 20,
	zoom: 2,
	bearing: 0,
	pitch: 0
};

// Map projection type
export type MapProjection = 'mercator' | 'globe';

// Base stores
export const viewport = writable<MapViewport>(DEFAULT_VIEWPORT);
export const projection = writable<MapProjection>('mercator');
export const showHeatmap = writable(false);
export const showClusters = writable(true);
export const showWatchboxes = writable(true);
export const showHospitals = writable(true);
export const isDrawingWatchbox = writable(false);
export const activeWatchboxId = writable<string | null>(null);
export const isAutoPlaying = writable(false);
export const entityLocations = writable<EntityLocationMarker[]>([]);
export const hospitals = writable<NipahHospitalMarker[]>([]);
export const hospitalsLoading = writable(false);

// Helper functions
export function setViewport(newViewport: Partial<MapViewport>) {
	viewport.update((current) => ({ ...current, ...newViewport }));
}

export function flyTo(longitude: number, latitude: number, zoom: number = 8) {
	viewport.update((current) => ({
		...current,
		longitude,
		latitude,
		zoom
	}));
}

export function toggleHeatmap() {
	showHeatmap.update((current) => !current);
}

export function toggleClusters() {
	showClusters.update((current) => !current);
}

export function toggleWatchboxes() {
	showWatchboxes.update((current) => !current);
}

export function toggleHospitals() {
	showHospitals.update((current) => !current);
}

export function toggleProjection() {
	projection.update((current) => (current === 'mercator' ? 'globe' : 'mercator'));
}

export function setProjection(newProjection: MapProjection) {
	projection.set(newProjection);
}

export function startDrawingWatchbox() {
	isDrawingWatchbox.set(true);
}

export function stopDrawingWatchbox() {
	isDrawingWatchbox.set(false);
}

export function setActiveWatchbox(id: string | null) {
	activeWatchboxId.set(id);
}

export function startAutoPlay() {
	isAutoPlaying.set(true);
}

export function stopAutoPlay() {
	isAutoPlaying.set(false);
}

export function setEntityLocations(entityName: string, locations: GeoLocation[]) {
	entityLocations.set(
		locations.map((loc) => ({
			...loc,
			entityName
		}))
	);
}

export function clearEntityLocations() {
	entityLocations.set([]);
}

export function setHospitals(newHospitals: NipahHospitalMarker[]) {
	hospitals.set(newHospitals);
}

export function setHospitalsLoading(loading: boolean) {
	hospitalsLoading.set(loading);
}
