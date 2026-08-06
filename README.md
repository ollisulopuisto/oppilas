# Oppilas

Kartta Helsingin koulujen oppilaaksiottoalueista. Klikkaa piiriä → "Avaa Oikotiessä" avaa Oikotien karttahaun niin, että piirin rajaus on valmiiksi piirrettynä hakualueena — hakuehdot, järjestys ja hakuvahdit toimivat Oikotien omassa käyttöliittymässä.

Staattinen sivusto, ei backendia:

- Piirirajat haetaan selaimessa suoraan Helsingin avoimen datan WFS-rajapinnasta (`kartta.hel.fi`, tasot `Opev_ooa_{alaaste,ylaaste}_{suomi,ruotsi}`, CORS sallittu).
- Oikotie-linkki on muotoa `https://asunnot.oikotie.fi/kartta/myytavat-asunnot?view=map&lat=…&lng=…&zoom=13&cardType=100&inclusiveLocations[geo]=MULTIPOLYGON(((lng lat,…)))` — sama muoto, jonka Oikotien "piirrä alue" -työkalu tuottaa (WKT, EPSG:4326, koordinaatit "lng lat"). Avainen **täytyy** olla sisäkkäinen `inclusiveLocations[geo]`; paljas `geo=` menee palvelimen parseriin mutta selainsovellus pudottaa sen. Polygoni yksinkertaistetaan (`@turf/simplify`) niin, että URL pysyy alle ~4 500 merkin.

Huomiot:

- `inclusiveLocations[geo]` on Oikotien sisäinen, dokumentoimaton käytäntö ja voi muuttua ilman varoitusta.
- Piirit ovat lukuvuoden mukaisia (nimissä esim. "2025-2026"); WFS:ssä on myös `_tuleva`-tasot, joita ei näytetä.

## Kehitys

```sh
npm install
npm run dev      # kehityspalvelin (lisää -- --host jos haluat LAN-käyttöön)
npm test         # vitest-yksikkötestit
npm run lint     # prettier + eslint (strict-type-checked)
npm run check    # svelte-check
npm run build    # staattinen build build/-hakemistoon
```

## Julkaisu

- **Vercel**: <https://oppilas.vercel.app> — repo on kytketty Verceliin, joten jokainen `main`-push julkaisee automaattisesti (`vercel.json`: staattinen build `build/`-hakemistosta).
- **GitHub Pages**: <https://ollisulopuisto.github.io/oppilas/> — `.github/workflows/deploy.yml` buildaa ja julkaisee jokaisesta `main`-pushista. Buildissa `BASE_PATH=/oppilas`, koska Pages tarjoilee sivun repopolun alta.

Versiointi: CalVer (`vYY.MM.DD.build`).
