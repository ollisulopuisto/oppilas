/**
 * Builds Oikotie map-search deep links from GeoJSON polygons.
 *
 * Oikotie's "piirrä alue kartalle" search serializes the drawn area into the
 * URL as WKT in EPSG:4326 with "lng lat" coordinate order, under the query key
 * `inclusiveLocations[geo]` (undocumented; reverse-engineered 2026-08-06 and
 * subject to change without notice).
 */
import simplify from '@turf/simplify';
import type { MultiPolygon, Polygon, Position } from 'geojson';

const OIKOTIE_SEARCH = 'https://asunnot.oikotie.fi/kartta/myytavat-asunnot';

/** Oikotie's own draw tool caps URLs well below this; keep links shareable. */
const URL_BUDGET = 4500;

function round(n: number): number {
	return Math.round(n * 1e5) / 1e5;
}

function ringToWkt(ring: Position[]): string {
	return ring.map(([lng, lat]) => `${String(round(lng))} ${String(round(lat))}`).join(',');
}

function outerRings(geometry: Polygon | MultiPolygon): Position[][] {
	// Oikotie's parser reads exactly one ring per polygon, so holes are dropped.
	return geometry.type === 'Polygon'
		? [geometry.coordinates[0]]
		: geometry.coordinates.map((polygon) => polygon[0]);
}

/** Serialize in the exact shape Oikotie's area search expects: lng lat, one ring per polygon. */
export function toWktMultiPolygon(geometry: Polygon | MultiPolygon): string {
	const polygons = outerRings(geometry).map((ring) => `((${ringToWkt(ring)}))`);
	return `MULTIPOLYGON(${polygons.join(', ')})`;
}

/** Simplify with escalating tolerance until the serialized form fits. */
function simplifyUntil(
	geometry: Polygon | MultiPolygon,
	fits: (g: Polygon | MultiPolygon) => boolean
): Polygon | MultiPolygon {
	let result = geometry;
	for (let tolerance = 0.00002; !fits(result) && tolerance <= 0.01; tolerance *= 2) {
		result = simplify(geometry, { tolerance, highQuality: true, mutate: false });
	}
	return result;
}

/** Reduce vertex count until the WKT string fits in maxChars. */
export function simplifyToBudget(
	geometry: Polygon | MultiPolygon,
	maxChars: number
): Polygon | MultiPolygon {
	return simplifyUntil(geometry, (g) => toWktMultiPolygon(g).length <= maxChars);
}

function center(geometry: Polygon | MultiPolygon): { lat: number; lng: number } {
	const points = outerRings(geometry).flat();
	const lngs = points.map(([lng]) => lng);
	const lats = points.map(([, lat]) => lat);
	return {
		lat: round((Math.min(...lats) + Math.max(...lats)) / 2),
		lng: round((Math.min(...lngs) + Math.max(...lngs)) / 2)
	};
}

function toUrl(geometry: Polygon | MultiPolygon): string {
	// The nested key is required: the server accepts a bare ?geo= too, but the
	// client app only hydrates its search state from inclusiveLocations[geo].
	const wkt = encodeURIComponent(toWktMultiPolygon(geometry));
	const { lat, lng } = center(geometry);
	return `${OIKOTIE_SEARCH}?view=map&lat=${String(lat)}&lng=${String(lng)}&zoom=13&cardType=100&inclusiveLocations%5Bgeo%5D=${wkt}`;
}

/**
 * Deep link into Oikotie's map search with the polygon pre-drawn as the search
 * area, simplified as needed to keep the URL shareable.
 */
export function buildOikotieUrl(geometry: Polygon | MultiPolygon): string {
	return toUrl(simplifyUntil(geometry, (g) => toUrl(g).length <= URL_BUDGET));
}
