import { afterEach, describe, expect, it, vi } from 'vitest';
import { DISTRICT_LAYERS, cleanSchoolName, fetchDistricts, wfsUrl } from './districts';
import fixture from './fixtures/wfs-districts.json';

describe('DISTRICT_LAYERS', () => {
	it('lists all four current layers with labels', () => {
		expect(DISTRICT_LAYERS.map((l) => l.id)).toEqual([
			'alaaste_suomi',
			'ylaaste_suomi',
			'alaaste_ruotsi',
			'ylaaste_ruotsi'
		]);
		expect(DISTRICT_LAYERS[0].label).toBe('Ala-aste (suomi)');
	});
});

describe('wfsUrl', () => {
	it('builds a GetFeature URL for the layer in EPSG:4326 GeoJSON', () => {
		const url = new URL(wfsUrl('alaaste_suomi'));
		expect(url.origin).toBe('https://kartta.hel.fi');
		expect(url.searchParams.get('typeName')).toBe('avoindata:Opev_ooa_alaaste_suomi');
		expect(url.searchParams.get('srsName')).toBe('EPSG:4326');
		expect(url.searchParams.get('outputFormat')).toBe('application/json');
	});
});

describe('cleanSchoolName', () => {
	it('strips the trailing school-year suffix', () => {
		expect(cleanSchoolName('Vuoniityn peruskoulu 2025-2026')).toBe('Vuoniityn peruskoulu');
	});

	it('leaves names without a suffix untouched', () => {
		expect(cleanSchoolName('Botby grundskola')).toBe('Botby grundskola');
	});

	it('handles null (Swedish name on Finnish layers)', () => {
		expect(cleanSchoolName(null)).toBe('');
	});
});

describe('fetchDistricts', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('fetches the layer and returns named district features', async () => {
		const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture), { status: 200 }));
		vi.stubGlobal('fetch', mock);

		const districts = await fetchDistricts('alaaste_suomi');

		expect(mock).toHaveBeenCalledWith(wfsUrl('alaaste_suomi'));
		expect(districts).toHaveLength(3);
		expect(districts[0].name).toBe('Vuoniityn peruskoulu');
		expect(districts[0].geometry.type).toBe('Polygon');
	});

	it('uses the Swedish name on Swedish layers', async () => {
		const swedish = structuredClone(fixture) as {
			features: { properties: { nimi_se: string | null } }[];
		};
		swedish.features[0].properties.nimi_se = 'Testskolan 2025-2026';
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response(JSON.stringify(swedish), { status: 200 }))
		);

		const districts = await fetchDistricts('alaaste_ruotsi');

		expect(districts[0].name).toBe('Testskolan');
	});

	it('throws on a non-OK response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 503 })));

		await expect(fetchDistricts('alaaste_suomi')).rejects.toThrow(/503/);
	});
});
