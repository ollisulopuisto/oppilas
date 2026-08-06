import { describe, expect, it } from 'vitest';
import type { MultiPolygon, Polygon } from 'geojson';
import { buildOikotieUrl, simplifyToBudget, toWktMultiPolygon } from './wkt';
import fixture from './fixtures/wfs-districts.json';

const square: Polygon = {
	type: 'Polygon',
	coordinates: [
		[
			[24.905, 60.15],
			[24.935, 60.15],
			[24.935, 60.165],
			[24.905, 60.165],
			[24.905, 60.15]
		]
	]
};

describe('toWktMultiPolygon', () => {
	it('wraps a Polygon into MULTIPOLYGON with lng lat order', () => {
		expect(toWktMultiPolygon(square)).toBe(
			'MULTIPOLYGON(((24.905 60.15,24.935 60.15,24.935 60.165,24.905 60.165,24.905 60.15)))'
		);
	});

	it('rounds coordinates to 5 decimals', () => {
		const p: Polygon = {
			type: 'Polygon',
			coordinates: [
				[
					[24.90512345, 60.15098765],
					[24.935, 60.15],
					[24.935, 60.165],
					[24.90512345, 60.15098765]
				]
			]
		};
		expect(toWktMultiPolygon(p)).toContain('24.90512 60.15099');
	});

	it('joins MultiPolygon parts and keeps only outer rings (Oikotie cannot parse holes)', () => {
		const mp: MultiPolygon = {
			type: 'MultiPolygon',
			coordinates: [
				[
					square.coordinates[0],
					// a hole, must be dropped
					[
						[24.91, 60.155],
						[24.92, 60.155],
						[24.92, 60.16],
						[24.91, 60.155]
					]
				],
				[
					[
						[25.0, 60.2],
						[25.01, 60.2],
						[25.01, 60.21],
						[25.0, 60.2]
					]
				]
			]
		};
		const wkt = toWktMultiPolygon(mp);
		expect(wkt).toBe(
			'MULTIPOLYGON(((24.905 60.15,24.935 60.15,24.935 60.165,24.905 60.165,24.905 60.15)), ((25 60.2,25.01 60.2,25.01 60.21,25 60.2)))'
		);
	});

	it('handles a real district polygon from the WFS fixture', () => {
		const geom = fixture.features[0].geometry as Polygon;
		const wkt = toWktMultiPolygon(geom);
		expect(wkt).toMatch(
			/^MULTIPOLYGON\(\(\((-?\d+(\.\d+)? -?\d+(\.\d+)?,)+-?\d+(\.\d+)? -?\d+(\.\d+)?\)\)\)$/
		);
	});
});

describe('simplifyToBudget', () => {
	it('returns geometry unchanged when already under budget', () => {
		expect(simplifyToBudget(square, 4000)).toEqual(square);
	});

	it('simplifies a real district under the character budget while staying a valid ring', () => {
		const geom = fixture.features[2].geometry as Polygon; // Torpparinmäki, ~399 vertices
		expect(toWktMultiPolygon(geom).length).toBeGreaterThan(3000);
		const simplified = simplifyToBudget(geom, 3000);
		const wkt = toWktMultiPolygon(simplified);
		expect(wkt.length).toBeLessThanOrEqual(3000);
		const ring = (simplified as Polygon).coordinates[0];
		expect(ring.length).toBeGreaterThanOrEqual(4);
		expect(ring[0]).toEqual(ring[ring.length - 1]);
	});
});

describe('buildOikotieUrl', () => {
	it('opens the map view with inclusiveLocations[geo], the param Oikotie hydrates search state from', () => {
		const url = new URL(buildOikotieUrl(square));
		expect(url.origin).toBe('https://asunnot.oikotie.fi');
		expect(url.pathname).toBe('/kartta/myytavat-asunnot');
		// A bare ?geo= is accepted by the server but dropped by the client app;
		// only the nested form reaches inclusiveLocations.geo in the search store.
		expect(url.searchParams.get('inclusiveLocations[geo]')).toBe(toWktMultiPolygon(square));
		expect(url.searchParams.get('cardType')).toBe('100');
		expect(url.searchParams.get('view')).toBe('map');
		// centered on the polygon so the drawn area is on screen
		expect(Number(url.searchParams.get('lat'))).toBeCloseTo(60.1575, 3);
		expect(Number(url.searchParams.get('lng'))).toBeCloseTo(24.92, 3);
		expect(Number(url.searchParams.get('zoom'))).toBeGreaterThanOrEqual(11);
	});

	it('stays under the URL budget for every fixture district', () => {
		for (const feature of fixture.features) {
			const url = buildOikotieUrl(feature.geometry as Polygon);
			expect(url.length).toBeLessThanOrEqual(4500);
		}
	});
});
