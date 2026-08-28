/**
 * Busca las coordenadas de la dirección de entrega de cada solicitud para que
 * aparezca como un punto propio en el mapa público.
 *
 * Uso:
 *   node scripts/geocode-solicitudes.mjs [--dry-run] [--force] [--ciudad "Pereira, Risaralda, Colombia"]
 *
 * Usa Nominatim (OpenStreetMap), gratuito y sin llave, respetando su límite de
 * una consulta por segundo. Guarda también el sector (barrio y ciudad), que es lo
 * único de la ubicación que se muestra en público.
 */
import process from 'node:process';
import 'dotenv/config';
import mysql from 'mysql2/promise';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const cityIndex = args.indexOf('--ciudad');
const DEFAULT_CITY =
  cityIndex >= 0 ? args[cityIndex + 1] : 'Pereira, Risaralda, Colombia';

const USER_AGENT = 'ABRIGAR/1.0 (gestion de ayuda humanitaria)';
/** Localidades reconocidas; la clave es como la escribe la gente. */
const KNOWN_CITIES = {
  dosquebradas: 'Dosquebradas',
  dosquebras: 'Dosquebradas',
  pereira: 'Pereira',
  caimalito: 'Caimalito',
  'santa rosa de cabal': 'Santa Rosa de Cabal',
  'la virginia': 'La Virginia',
};

function normalize(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Completa la ciudad cuando la dirección solo trae el barrio o la nomenclatura. */
function buildQueries(address) {
  const text = address.trim();
  const lower = normalize(text);
  const alias = Object.keys(KNOWN_CITIES).find((name) => lower.includes(name));
  const city = alias ? KNOWN_CITIES[alias] : null;
  const suffix = city ? `${city}, Risaralda, Colombia` : DEFAULT_CITY;
  const withCity = city ? text : `${text}, ${suffix}`;

  // Segundo intento sin número de casa ni apartamento: sirve para ubicar el sector.
  const simplified = text
    .replace(/(casa|apto|apartamento|bloque|manzana|mz)\s*[\w-]*/gi, ' ')
    .replace(/#.*/g, ' ')
    .replace(/\d+\s*[a-z]?\s*-\s*\d+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const queries = [withCity];
  if (simplified && normalize(simplified) !== normalize(text)) {
    queries.push(city ? `${simplified}, Risaralda, Colombia` : `${simplified}, ${suffix}`);
    queries.push(`Barrio ${simplified}, ${suffix}`);
  } else {
    queries.push(`Barrio ${text}, ${suffix}`);
  }
  // Si la dirección nombra una localidad concreta, su centro es el último recurso válido.
  if (city) {
    queries.push(suffix);
  }
  return { queries, city: suffix, namedLocality: Boolean(city) };
}

const centroids = new Map();

/** Coordenadas del municipio, para reconocer los resultados que no ubican nada. */
async function cityCentroid(city) {
  const key = normalize(city);
  if (!centroids.has(key)) {
    const hit = await rawGeocode(city);
    centroids.set(key, hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null);
    await wait(1100);
  }
  return centroids.get(key);
}

/** Distancia aproximada en metros entre dos coordenadas cercanas. */
function metersBetween(a, b) {
  const latMeters = (a.lat - b.lat) * 111_320;
  const lonMeters = (a.lon - b.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(latMeters ** 2 + lonMeters ** 2);
}

async function rawGeocode(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'co');
  url.searchParams.set('q', query);

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Nominatim respondió ${response.status}`);
  }
  const results = await response.json();
  return results.length ? results[0] : null;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Geocodifica y descarta el resultado si solo apunta al centro del municipio.
 * Cuando la dirección nombra una localidad concreta (un corregimiento, otro
 * municipio) su centro sí es una ubicación válida.
 */
async function geocode(query, city, allowCentroid) {
  const hit = await rawGeocode(query);
  if (!hit) return null;

  const point = { lat: Number(hit.lat), lon: Number(hit.lon) };
  const centroid = await cityCentroid(city);
  if (!allowCentroid && centroid && metersBetween(point, centroid) < 300) return null;

  return {
    latitude: point.lat.toFixed(7),
    longitude: point.lon.toFixed(7),
    label: buildLabel(hit, city),
  };
}

/**
 * Etiqueta legible tipo "La Isla, Pereira". Se descartan los nombres
 * administrativos que no dicen nada al lector, como el área metropolitana.
 */
function buildLabel(hit, city) {
  const detail = hit.address ?? {};
  const municipality = city.split(',')[0].trim();
  const useful = (value) =>
    value && !normalize(value).includes('amco') && !normalize(value).includes('area metropolitana')
      ? value.replace(/per[íi]metro urbano\s*/i, '').trim()
      : null;

  const sector = useful(
    detail.neighbourhood ?? detail.suburb ?? detail.city_district ?? detail.village,
  );
  const town = useful(detail.city ?? detail.town ?? detail.municipality) ?? municipality;
  const label = sector && normalize(sector) !== normalize(town) ? `${sector}, ${town}` : town;
  return label.slice(0, 160);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  const [rows] = await connection.execute(
    `SELECT id, residence_after AS address, people_count AS people
     FROM help_requests
     WHERE residence_after <> ''
       ${force ? '' : 'AND (latitude IS NULL OR longitude IS NULL)'}
     ORDER BY id`,
  );

  console.log(`Solicitudes por ubicar: ${rows.length}`);
  let located = 0;
  let failed = 0;

  for (const row of rows) {
    let found = null;
    const { queries, city, namedLocality } = buildQueries(row.address);
    for (const query of queries) {
      // eslint-disable-next-line no-await-in-loop
      found = await geocode(query, city, namedLocality);
      // eslint-disable-next-line no-await-in-loop
      await wait(1100);
      if (found) break;
    }

    if (!found) {
      failed += 1;
      console.log(`#${row.id} ✗ sin ubicar — ${row.address}`);
      if (!dryRun) {
        // eslint-disable-next-line no-await-in-loop
        await connection.execute(
          'UPDATE help_requests SET latitude = NULL, longitude = NULL, geo_label = NULL WHERE id = ?',
          [row.id],
        );
      }
      continue;
    }

    located += 1;
    console.log(
      `#${row.id} ✓ ${found.label} (${found.latitude}, ${found.longitude}) — ${row.address}`,
    );
    if (!dryRun) {
      // eslint-disable-next-line no-await-in-loop
      await connection.execute(
        'UPDATE help_requests SET latitude = ?, longitude = ?, geo_label = ? WHERE id = ?',
        [found.latitude, found.longitude, found.label, row.id],
      );
    }
  }

  console.log(`\nUbicadas: ${located} · sin ubicar: ${failed}${dryRun ? ' (simulación)' : ''}`);
} finally {
  await connection.end();
}
