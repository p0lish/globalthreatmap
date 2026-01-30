<script lang="ts">
	import { onMount, onDestroy, mount } from "svelte";
	import mapboxgl from "mapbox-gl";
	import "mapbox-gl/dist/mapbox-gl.css";
	import {
		viewport,
		setViewport,
		showHeatmap,
		showClusters,
		entityLocations,
		showHospitals,
		hospitals,
		setHospitals,
		setHospitalsLoading,
		projection,
		globeRotating,
		setGlobeRotating,
		sidebarCollapsed,
	} from "$lib/stores/map";
	import { filteredEvents, selectedEvent } from "$lib/stores/events";
	import { isAuthenticated } from "$lib/stores/auth";
	import { threatLevelColors } from "$lib/types";
	import EventPopup from "./EventPopup.svelte";
	import CountryNewsModal from "./CountryNewsModal.svelte";
	import SignInModal from "$lib/components/auth/SignInModal.svelte";
	import type { ThreatEvent } from "$lib/types";

	const APP_MODE = import.meta.env.VITE_APP_MODE || "self-hosted";
	const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

	let mapContainer: HTMLDivElement;
	let map: mapboxgl.Map | null = null;
	let popup: mapboxgl.Popup | null = null;

	let selectedEntityLocation = $state<{
		longitude: number;
		latitude: number;
		placeName: string;
		entityName: string;
		country?: string;
	} | null>(null);

	let selectedHospital = $state<{
		longitude: number;
		latitude: number;
		hospitalName: string;
		city: string;
		country: string;
		status: "active" | "contained" | "monitoring";
		caseCount?: number;
		lastReported?: string;
	} | null>(null);

	let selectedCountry = $state<string | null>(null);
	let selectedCountryCode = $state<string | null>(null);
	let isCountryLoading = $state(false);
	let blinkOpacity = $state(0.4);
	let showSignInModal = $state(false);

	let requiresAuth = $derived(APP_MODE === "valyu");

	function getSeverityValue(threatLevel: string): number {
		const values: Record<string, number> = {
			critical: 5,
			high: 4,
			medium: 3,
			low: 2,
			info: 1,
		};
		return values[threatLevel] || 2;
	}

	function createGeoJSON(events: ThreatEvent[]) {
		return {
			type: "FeatureCollection" as const,
			features: events.map((event) => ({
				type: "Feature" as const,
				properties: {
					id: event.id,
					title: event.title,
					category: event.category,
					threatLevel: event.threatLevel,
					severity: getSeverityValue(event.threatLevel),
					timestamp: event.timestamp,
				},
				geometry: {
					type: "Point" as const,
					coordinates: [
						event.location.longitude,
						event.location.latitude,
					],
				},
			})),
		};
	}

	function createEntityLocationsGeoJSON() {
		return {
			type: "FeatureCollection" as const,
			features: $entityLocations.map((location, index) => ({
				type: "Feature" as const,
				properties: {
					id: `entity-loc-${index}`,
					placeName:
						location.placeName || location.country || "Unknown",
					entityName: location.entityName,
					country: location.country,
				},
				geometry: {
					type: "Point" as const,
					coordinates: [location.longitude, location.latitude],
				},
			})),
		};
	}

	function createHospitalsGeoJSON() {
		return {
			type: "FeatureCollection" as const,
			features: $hospitals.map((hospital, index) => ({
				type: "Feature" as const,
				properties: {
					id: `hospital-${index}`,
					hospitalName: hospital.hospitalName,
					city: hospital.city,
					country: hospital.country,
					status: hospital.status,
					caseCount: hospital.caseCount,
					lastReported: hospital.lastReported,
				},
				geometry: {
					type: "Point" as const,
					coordinates: [hospital.longitude, hospital.latitude],
				},
			})),
		};
	}

	function initMap() {
		if (!MAPBOX_TOKEN || !mapContainer) return;

		mapboxgl.accessToken = MAPBOX_TOKEN;

		map = new mapboxgl.Map({
			container: mapContainer,
			style: "mapbox://styles/mapbox/dark-v11",
			center: [$viewport.longitude, $viewport.latitude],
			zoom: $viewport.zoom,
			bearing: $viewport.bearing || 0,
			pitch: $viewport.pitch || 0,
			attributionControl: false,
		});

		map.addControl(new mapboxgl.NavigationControl(), "top-right");
		map.addControl(new mapboxgl.GeolocateControl(), "top-right");
		map.addControl(new mapboxgl.ScaleControl(), "bottom-right");

		map.on("load", () => {
			addLayers();
			updateEventData();
		});

		map.on("move", () => {
			if (!map) return;
			const center = map.getCenter();
			setViewport({
				longitude: center.lng,
				latitude: center.lat,
				zoom: map.getZoom(),
				bearing: map.getBearing(),
				pitch: map.getPitch(),
			});
		});

		map.on("click", handleMapClick);
		map.on(
			"mouseenter",
			"clusters",
			() => map && (map.getCanvas().style.cursor = "pointer"),
		);
		map.on(
			"mouseleave",
			"clusters",
			() => map && (map.getCanvas().style.cursor = ""),
		);
		map.on(
			"mouseenter",
			"unclustered-point",
			() => map && (map.getCanvas().style.cursor = "pointer"),
		);
		map.on(
			"mouseleave",
			"unclustered-point",
			() => map && (map.getCanvas().style.cursor = ""),
		);
	}

	function addLayers() {
		if (!map) return;

		// Add events source
		map.addSource("events", {
			type: "geojson",
			data: createGeoJSON($filteredEvents),
			cluster: $showClusters,
			clusterMaxZoom: 14,
			clusterRadius: 50,
		});

		// Heatmap layer
		map.addLayer({
			id: "events-heat",
			type: "heatmap",
			source: "events",
			maxzoom: 9,
			layout: {
				visibility: $showHeatmap ? "visible" : "none",
			},
			paint: {
				"heatmap-weight": [
					"interpolate",
					["linear"],
					["get", "severity"],
					0,
					0,
					5,
					1,
				],
				"heatmap-intensity": [
					"interpolate",
					["linear"],
					["zoom"],
					0,
					1,
					9,
					3,
				],
				"heatmap-color": [
					"interpolate",
					["linear"],
					["heatmap-density"],
					0,
					"rgba(0, 0, 0, 0)",
					0.2,
					"rgba(59, 130, 246, 0.5)",
					0.4,
					"rgba(234, 179, 8, 0.6)",
					0.6,
					"rgba(249, 115, 22, 0.7)",
					0.8,
					"rgba(239, 68, 68, 0.8)",
					1,
					"rgba(220, 38, 38, 0.9)",
				],
				"heatmap-radius": [
					"interpolate",
					["linear"],
					["zoom"],
					0,
					2,
					9,
					20,
				],
				"heatmap-opacity": 0.8,
			},
		});

		// Cluster layer
		map.addLayer({
			id: "clusters",
			type: "circle",
			source: "events",
			filter: ["has", "point_count"],
			layout: {
				visibility: $showClusters ? "visible" : "none",
			},
			paint: {
				"circle-color": [
					"step",
					["get", "point_count"],
					"#3b82f6",
					10,
					"#eab308",
					30,
					"#f97316",
					100,
					"#ef4444",
				],
				"circle-radius": [
					"step",
					["get", "point_count"],
					12,
					10,
					16,
					30,
					20,
					100,
					24,
				],
				"circle-stroke-width": 2,
				"circle-stroke-color": "#1e293b",
				"circle-opacity": 0.85,
			},
		});

		// Cluster count layer
		map.addLayer({
			id: "cluster-count",
			type: "symbol",
			source: "events",
			filter: ["has", "point_count"],
			layout: {
				visibility: $showClusters ? "visible" : "none",
				"text-field": ["get", "point_count_abbreviated"],
				"text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
				"text-size": 11,
			},
			paint: {
				"text-color": "#ffffff",
			},
		});

		// Unclustered point layer
		map.addLayer({
			id: "unclustered-point",
			type: "circle",
			source: "events",
			filter: ["!", ["has", "point_count"]],
			paint: {
				"circle-color": [
					"match",
					["get", "threatLevel"],
					"critical",
					threatLevelColors.critical,
					"high",
					threatLevelColors.high,
					"medium",
					threatLevelColors.medium,
					"low",
					threatLevelColors.low,
					"info",
					threatLevelColors.info,
					"#3b82f6",
				],
				"circle-radius": 8,
				"circle-stroke-width": 2,
				"circle-stroke-color": "#1e293b",
			},
		});

		// Entity locations source and layers
		map.addSource("entity-locations", {
			type: "geojson",
			data: createEntityLocationsGeoJSON(),
		});

		map.addLayer({
			id: "entity-locations",
			type: "circle",
			source: "entity-locations",
			paint: {
				"circle-color": "#a855f7",
				"circle-radius": 10,
				"circle-stroke-width": 3,
				"circle-stroke-color": "#ffffff",
			},
		});

		map.addLayer({
			id: "entity-location-labels",
			type: "symbol",
			source: "entity-locations",
			layout: {
				"text-field": ["get", "placeName"],
				"text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
				"text-size": 12,
				"text-offset": [0, 1.5],
				"text-anchor": "top",
			},
			paint: {
				"text-color": "#a855f7",
				"text-halo-color": "#1e293b",
				"text-halo-width": 1,
			},
		});

		// Hospitals source and layers
		map.addSource("hospitals", {
			type: "geojson",
			data: createHospitalsGeoJSON(),
		});

		map.addLayer({
			id: "hospitals-circle",
			type: "circle",
			source: "hospitals",
			layout: {
				visibility: $showHospitals ? "visible" : "none",
			},
			paint: {
				"circle-color": [
					"match",
					["get", "status"],
					"active",
					"#ef4444",
					"contained",
					"#eab308",
					"monitoring",
					"#3b82f6",
					"#3b82f6",
				],
				"circle-radius": 8,
				"circle-stroke-width": 3,
				"circle-stroke-color": [
					"match",
					["get", "status"],
					"active",
					"#991b1b",
					"contained",
					"#854d0e",
					"monitoring",
					"#1e40af",
					"#1e40af",
				],
			},
		});

		map.addLayer({
			id: "hospitals-labels",
			type: "symbol",
			source: "hospitals",
			layout: {
				visibility: $showHospitals ? "visible" : "none",
				"text-field": ["get", "hospitalName"],
				"text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
				"text-size": 10,
				"text-offset": [0, 1.2],
				"text-anchor": "top",
			},
			paint: {
				"text-color": [
					"match",
					["get", "status"],
					"active",
					"#ef4444",
					"contained",
					"#eab308",
					"monitoring",
					"#3b82f6",
					"#3b82f6",
				],
				"text-halo-color": "#1e293b",
				"text-halo-width": 1,
			},
		});

		// Country boundaries source
		map.addSource("country-boundaries", {
			type: "vector",
			url: "mapbox://mapbox.country-boundaries-v1",
		});
	}

	function updateEventData() {
		if (!map || !map.getSource("events")) return;
		const source = map.getSource("events") as mapboxgl.GeoJSONSource;
		source.setData(createGeoJSON($filteredEvents));
	}

	function updateEntityLocations() {
		if (!map || !map.getSource("entity-locations")) return;
		const source = map.getSource(
			"entity-locations",
		) as mapboxgl.GeoJSONSource;
		source.setData(createEntityLocationsGeoJSON());
	}

	function updateHospitals() {
		if (!map || !map.getSource("hospitals")) return;
		const source = map.getSource("hospitals") as mapboxgl.GeoJSONSource;
		source.setData(createHospitalsGeoJSON());
	}

	function updateCountryHighlight() {
		if (!map) return;

		// Remove existing highlight layers
		if (map.getLayer("country-highlight")) {
			map.removeLayer("country-highlight");
		}
		if (map.getLayer("country-highlight-outline")) {
			map.removeLayer("country-highlight-outline");
		}

		if (selectedCountryCode) {
			map.addLayer(
				{
					id: "country-highlight",
					type: "fill",
					source: "country-boundaries",
					"source-layer": "country_boundaries",
					filter: [
						"all",
						["==", ["get", "iso_3166_1"], selectedCountryCode],
						["==", ["get", "worldview"], "all"],
					],
					paint: {
						"fill-color": "#ef4444",
						"fill-opacity": blinkOpacity,
					},
				},
				"waterway-label",
			);

			map.addLayer(
				{
					id: "country-highlight-outline",
					type: "line",
					source: "country-boundaries",
					"source-layer": "country_boundaries",
					filter: [
						"all",
						["==", ["get", "iso_3166_1"], selectedCountryCode],
						["==", ["get", "worldview"], "all"],
					],
					paint: {
						"line-color": "#ef4444",
						"line-width": 2,
						"line-opacity": 0.8,
					},
				},
				"waterway-label",
			);
		}
	}

	async function handleMapClick(e: mapboxgl.MapMouseEvent) {
		if (!map) return;

		const features = map.queryRenderedFeatures(e.point, {
			layers: [
				"clusters",
				"unclustered-point",
				"entity-locations",
				"hospitals-circle",
			],
		});

		if (features.length > 0) {
			const feature = features[0];
			const layerId = feature.layer?.id;

			if (layerId === "clusters") {
				const clusterId = feature.properties?.cluster_id;
				const source = map.getSource(
					"events",
				) as mapboxgl.GeoJSONSource;

				source.getClusterExpansionZoom(clusterId, (err, zoom) => {
					if (err || !map) return;
					const coords = (feature.geometry as GeoJSON.Point)
						.coordinates as [number, number];
					map.easeTo({
						center: coords,
						zoom: zoom || $viewport.zoom + 2,
						duration: 500,
					});
				});
				return;
			} else if (layerId === "unclustered-point") {
				const eventId = feature.properties?.id;
				const clickedEvent = $filteredEvents.find(
					(e) => e.id === eventId,
				);
				if (clickedEvent) {
					selectedEvent.set(clickedEvent);
					selectedEntityLocation = null;
					selectedHospital = null;
				}
				return;
			} else if (layerId === "entity-locations") {
				const coords = (feature.geometry as GeoJSON.Point).coordinates;
				selectedEntityLocation = {
					longitude: coords[0],
					latitude: coords[1],
					placeName: feature.properties?.placeName || "Unknown",
					entityName: feature.properties?.entityName || "Unknown",
					country: feature.properties?.country,
				};
				selectedEvent.set(null);
				selectedHospital = null;
				return;
			} else if (layerId === "hospitals-circle") {
				const coords = (feature.geometry as GeoJSON.Point).coordinates;
				selectedHospital = {
					longitude: coords[0],
					latitude: coords[1],
					hospitalName:
						feature.properties?.hospitalName || "Hospital",
					city: feature.properties?.city || "Unknown",
					country: feature.properties?.country || "Unknown",
					status: feature.properties?.status || "monitoring",
					caseCount: feature.properties?.caseCount,
					lastReported: feature.properties?.lastReported,
				};
				selectedEvent.set(null);
				selectedEntityLocation = null;
				return;
			}
		}

		// No feature clicked, reverse geocode for country
		selectedEvent.set(null);
		selectedEntityLocation = null;
		selectedHospital = null;

		try {
			const response = await fetch(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${e.lngLat.lng},${e.lngLat.lat}.json?types=country&access_token=${MAPBOX_TOKEN}`,
			);
			const data = await response.json();

			if (data.features && data.features.length > 0) {
				const countryFeature = data.features[0];
				const countryName = countryFeature.place_name;
				const countryCode =
					countryFeature.properties?.short_code?.toUpperCase() ||
					null;

				if (requiresAuth && !$isAuthenticated) {
					showSignInModal = true;
					return;
				}

				selectedCountry = countryName;
				selectedCountryCode = countryCode;
				isCountryLoading = true;
			}
		} catch (error) {
			console.error("Error reverse geocoding:", error);
		}
	}

	function showEventPopup(event: ThreatEvent) {
		if (!map) return;

		if (popup) {
			popup.remove();
		}

		const container = document.createElement("div");
		container.className = "event-popup-container";

		popup = new mapboxgl.Popup({
			closeButton: true,
			closeOnClick: false,
			className: "threat-popup",
			maxWidth: "400px",
		})
			.setLngLat([event.location.longitude, event.location.latitude])
			.setDOMContent(container)
			.addTo(map);

		// Mount Svelte component using Svelte 5 mount API
		mount(EventPopup, {
			target: container,
			props: { event },
		});

		popup.on("close", () => {
			selectedEvent.set(null);
		});
	}

	// Fetch hospitals on mount
	onMount(async () => {
		initMap();
	});

	onDestroy(() => {
		if (popup) popup.remove();
		if (map) map.remove();
	});

	// Reactive updates
	$effect(() => {
		updateEventData();
	});

	$effect(() => {
		updateEntityLocations();
	});

	$effect(() => {
		updateHospitals();
	});

	$effect(() => {
		if (map && map.getLayer("events-heat")) {
			map.setLayoutProperty(
				"events-heat",
				"visibility",
				$showHeatmap ? "visible" : "none",
			);
		}
	});

	$effect(() => {
		if (map) {
			if (map.getLayer("clusters")) {
				map.setLayoutProperty(
					"clusters",
					"visibility",
					$showClusters ? "visible" : "none",
				);
			}
			if (map.getLayer("cluster-count")) {
				map.setLayoutProperty(
					"cluster-count",
					"visibility",
					$showClusters ? "visible" : "none",
				);
			}
		}
	});

	$effect(() => {
		if (map) {
			if (map.getLayer("hospitals-circle")) {
				map.setLayoutProperty(
					"hospitals-circle",
					"visibility",
					$showHospitals ? "visible" : "none",
				);
			}
			if (map.getLayer("hospitals-labels")) {
				map.setLayoutProperty(
					"hospitals-labels",
					"visibility",
					$showHospitals ? "visible" : "none",
				);
			}
		}
	});

	$effect(() => {
		if (map) {
			map.setProjection($projection);
			// Stop rotation when switching to mercator
			if ($projection === 'mercator') {
				setGlobeRotating(false);
			}
		}
	});

	$effect(() => {
		// Globe rotation animation
		if (!map || !$globeRotating || $projection !== 'globe') return;

		let animationId: number;
		const rotateGlobe = () => {
			if (!map || !$globeRotating) return;
			const center = map.getCenter();
			center.lng += 0.2; // Rotation speed
			map.setCenter(center);
			animationId = requestAnimationFrame(rotateGlobe);
		};

		animationId = requestAnimationFrame(rotateGlobe);

		return () => {
			if (animationId) {
				cancelAnimationFrame(animationId);
			}
		};
	});

	$effect(() => {
		// Trigger map resize when sidebar collapses/expands
		$sidebarCollapsed;
		if (map) {
			// Wait for CSS transition to complete (300ms)
			setTimeout(() => {
				map?.resize();
			}, 310);
		}
	});

	$effect(() => {
		if ($selectedEvent) {
			showEventPopup($selectedEvent);
		} else if (popup) {
			popup.remove();
			popup = null;
		}
	});

	$effect(() => {
		updateCountryHighlight();
	});

	// Blinking effect for country highlight
	$effect(() => {
		if (!selectedCountryCode || !isCountryLoading) {
			blinkOpacity = 0.4;
			return;
		}

		const interval = setInterval(() => {
			blinkOpacity = blinkOpacity === 0.4 ? 0.15 : 0.4;
		}, 400);

		return () => clearInterval(interval);
	});

	function handleCountryModalClose() {
		selectedCountry = null;
		selectedCountryCode = null;
		isCountryLoading = false;
	}

	function handleCountryLoadingChange(loading: boolean) {
		isCountryLoading = loading;
	}
</script>

{#if !MAPBOX_TOKEN}
	<div class="flex h-full w-full items-center justify-center bg-card">
		<div class="text-center">
			<p class="text-lg font-semibold text-foreground">
				Mapbox Token Required
			</p>
			<p class="text-sm text-muted-foreground">
				Please add VITE_MAPBOX_TOKEN to your .env file
			</p>
		</div>
	</div>
{:else}
	<div bind:this={mapContainer} class="h-full w-full"></div>
{/if}

{#if selectedCountry}
	<CountryNewsModal
		country={selectedCountry}
		onclose={handleCountryModalClose}
		onloadingchange={handleCountryLoadingChange}
	/>
{/if}

<SignInModal
	open={showSignInModal}
	onopenchange={(open) => (showSignInModal = open)}
/>

<style>
	:global(.mapboxgl-popup-content) {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		padding: 0;
	}

	:global(.mapboxgl-popup-close-button) {
		color: hsl(var(--muted-foreground));
		font-size: 1.25rem;
		padding: 0.25rem 0.5rem;
	}

	:global(.mapboxgl-popup-close-button:hover) {
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
	}

	:global(.mapboxgl-popup-tip) {
		border-top-color: hsl(var(--card));
	}
</style>
