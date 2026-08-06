<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import * as L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import {
		DISTRICT_LAYERS,
		fetchDistricts,
		type District,
		type DistrictLayerId
	} from '$lib/districts';
	import { buildOikotieUrl } from '$lib/wkt';

	let mapElement: HTMLDivElement;
	let map: L.Map | undefined;
	let districtLayer: L.GeoJSON | undefined;

	let activeLayer: DistrictLayerId = $state('alaaste_suomi');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let districtCount = $state(0);

	const cache = new SvelteMap<DistrictLayerId, District[]>();

	function popupContent(district: District): HTMLElement {
		const container = document.createElement('div');
		container.className = 'district-popup';

		const title = document.createElement('strong');
		title.textContent = district.name;
		container.append(title);

		const link = document.createElement('a');
		link.href = buildOikotieUrl(district.geometry);
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		link.textContent = 'Avaa Oikotiessä ↗';
		container.append(link);

		return container;
	}

	async function showLayer(layerId: DistrictLayerId): Promise<void> {
		if (!map) return;
		loading = true;
		error = null;
		try {
			let districts = cache.get(layerId);
			if (!districts) {
				districts = await fetchDistricts(layerId);
				cache.set(layerId, districts);
			}
			if (layerId !== activeLayer) return; // user switched again mid-fetch
			districtLayer?.remove();
			districtLayer = L.geoJSON(
				districts.map((d) => ({
					type: 'Feature' as const,
					properties: d,
					geometry: d.geometry
				})),
				{
					style: { color: '#0b5fff', weight: 1.5, fillOpacity: 0.08 },
					onEachFeature: (feature, layer) => {
						const district = feature.properties as District;
						layer.bindTooltip(district.name, { sticky: true });
						layer.bindPopup(() => popupContent(district));
						layer.on('mouseover', () => {
							(layer as L.Path).setStyle({ fillOpacity: 0.25 });
						});
						layer.on('mouseout', () => {
							(layer as L.Path).setStyle({ fillOpacity: 0.08 });
						});
					}
				}
			).addTo(map);
			districtCount = districts.length;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Piirien lataus epäonnistui';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		map = L.map(mapElement, { center: [60.2, 24.95], zoom: 11 });
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, piirit: Helsingin kaupunki'
		}).addTo(map);
		void showLayer(activeLayer);
		return () => {
			map?.remove();
		};
	});
</script>

<svelte:head>
	<title>Oppilaaksiottoalueet × Oikotie</title>
	<meta
		name="description"
		content="Valitse Helsingin koulun oppilaaksiottoalue ja avaa myytävät asunnot Oikotiessä."
	/>
</svelte:head>

<div class="app">
	<header>
		<h1>Oppilaaksiottoalueet × Oikotie</h1>
		<fieldset>
			<legend class="visually-hidden">Aluetaso</legend>
			{#each DISTRICT_LAYERS as layer (layer.id)}
				<label>
					<input
						type="radio"
						name="layer"
						value={layer.id}
						bind:group={activeLayer}
						onchange={() => void showLayer(layer.id)}
					/>
					{layer.label}
				</label>
			{/each}
		</fieldset>
		<p class="status" role="status">
			{#if loading}
				Ladataan piirejä…
			{:else if error}
				<span class="error">{error}</span>
			{:else}
				{districtCount} piiriä — klikkaa piiriä ja avaa asunnot Oikotiessä
			{/if}
		</p>
	</header>
	<div class="map" bind:this={mapElement}></div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.app {
		display: flex;
		flex-direction: column;
		height: 100dvh;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 1.5rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid #ddd;
	}

	h1 {
		font-size: 1.1rem;
		margin: 0;
	}

	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		border: none;
		margin: 0;
		padding: 0;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.status {
		margin: 0;
		font-size: 0.85rem;
		color: #555;
	}

	.error {
		color: #b00020;
	}

	.map {
		flex: 1;
		min-height: 0;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}

	:global(.district-popup) {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.95rem;
	}
</style>
