/**
 * Loads Helsinki school catchment areas (oppilaaksiottoalueet) from the city's
 * open-data WFS (kartta.hel.fi, CORS-enabled, no auth). One layer per school
 * level × language; the WFS also has `_tuleva` (next school year) variants,
 * which this app does not show.
 */
import type { MultiPolygon, Polygon } from 'geojson';

export type DistrictLayerId =
	'alaaste_suomi' | 'ylaaste_suomi' | 'alaaste_ruotsi' | 'ylaaste_ruotsi';

export interface DistrictLayer {
	id: DistrictLayerId;
	label: string;
}

export interface District {
	id: number;
	name: string;
	geometry: Polygon | MultiPolygon;
}

export const DISTRICT_LAYERS: DistrictLayer[] = [
	{ id: 'alaaste_suomi', label: 'Ala-aste (suomi)' },
	{ id: 'ylaaste_suomi', label: 'Yläaste (suomi)' },
	{ id: 'alaaste_ruotsi', label: 'Ala-aste (ruotsi)' },
	{ id: 'ylaaste_ruotsi', label: 'Yläaste (ruotsi)' }
];

interface WfsFeature {
	properties: { id: number; nimi_fi: string | null; nimi_se: string | null };
	geometry: Polygon | MultiPolygon;
}

interface WfsResponse {
	features: WfsFeature[];
}

export function wfsUrl(layer: DistrictLayerId): string {
	const params = new URLSearchParams({
		service: 'WFS',
		version: '2.0.0',
		request: 'GetFeature',
		typeName: `avoindata:Opev_ooa_${layer}`,
		outputFormat: 'application/json',
		srsName: 'EPSG:4326'
	});
	return `https://kartta.hel.fi/ws/geoserver/avoindata/wfs?${params.toString()}`;
}

/** District names carry a school-year suffix, e.g. "Vuoniityn peruskoulu 2025-2026". */
export function cleanSchoolName(name: string | null): string {
	return (name ?? '').replace(/\s+\d{4}-\d{4}\s*$/, '');
}

export async function fetchDistricts(layer: DistrictLayerId): Promise<District[]> {
	const response = await fetch(wfsUrl(layer));
	if (!response.ok) {
		throw new Error(`WFS request for ${layer} failed: ${String(response.status)}`);
	}
	const data = (await response.json()) as WfsResponse;
	const swedish = layer.endsWith('_ruotsi');
	return data.features.map((feature) => ({
		id: feature.properties.id,
		name: cleanSchoolName(
			swedish
				? (feature.properties.nimi_se ?? feature.properties.nimi_fi)
				: feature.properties.nimi_fi
		),
		geometry: feature.geometry
	}));
}
