/**
 * Importa a la base el historial de familias atendidas antes de la aplicación.
 *
 * Uso:
 *   node scripts/import-historial.mjs <url-o-ruta-del-csv> [--dry-run]
 *
 * El CSV debe tener las columnas del formulario de Google ("Marca temporal",
 * "Nombre Completo", ...). Cada fila se guarda como una solicitud entregada con
 * source='historial'. La importación es idempotente: si una fila ya existe
 * (misma marca temporal e identificación) se omite.
 */
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import 'dotenv/config';
import mysql from 'mysql2/promise';

const [source, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry-run');

if (!source) {
  console.error('Falta el CSV. Ejemplo: node scripts/import-historial.mjs historial.csv');
  process.exit(1);
}

const COLUMNS = {
  timestamp: 'Marca temporal',
  fullName: 'Nombre Completo',
  identificationNumber: 'Numero de Identificacion',
  residenceBefore: 'Lugar de residencia (antes del terremoto)',
  residenceAfter:
    'Lugar de residencia -o albergue- (después del terremoto) -A esta dirección enviaríamos los paquetes de ropa-',
  phoneWhatsapp: 'Celular/WhatsApp de contacto',
  affectationType: 'Tipo de afectación sufrida',
  clothingScope: '¿Necesitas ropa sólo para tu núcleo familiar o también para tu comunidad?',
  peopleCount: 'Número aproximado de personas que necesitan ropa',
  hasOwnTransport: '¿Tiene transporte propio para recoger la ropa?',
  babySizes: 'Talla(s) / Edad(es) para ropa de bebé',
  girlShirtSizes: 'Talla(s) de camisas/camisetas de niña',
  girlPantsSizes: 'Talla(s) de pantalones de niña',
  womanShirtSizes: 'Talla(s) de blusas/camisas/camisetas de mujer',
  womanPantsSizes: 'Talla(s) de pantalones de mujer',
  boyShirtSizes: 'Talla(s) de camisas/camisetas de niño',
  boyPantsSizes: 'Talla(s) de pantalones de niño',
  manShirtSizes: 'Talla(s) de camisas/camisetas de hombre',
  manPantsSizes: 'Talla(s) de pantalones de hombre',
  underwearNeeds: '¿Qué tipo de ropa interior necesitas?',
  needsLinens: '¿Necesitas sábanas, cobijas y toallas?',
  needsDiapers: '¿Necesitas pañales?',
  needsSanitary: '¿Necesitas toallas higiénicas y protectores?',
  additionalNeeds: '¿Necesitas algo más que podamos intentar gestionar?',
};

const WORD_NUMBERS = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  cien: 100,
  doscientos: 200,
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value.trim() !== ''));
}

function normalize(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Empareja los encabezados del CSV con las claves internas, tolerando espacios. */
function buildIndex(header) {
  const index = {};
  const normalized = header.map((title) => normalize(title));
  for (const [key, title] of Object.entries(COLUMNS)) {
    const wanted = normalize(title);
    const position = normalized.findIndex(
      (candidate) => candidate === wanted || candidate.startsWith(wanted),
    );
    if (position === -1) {
      throw new Error(`El CSV no tiene la columna "${title}"`);
    }
    index[key] = position;
  }
  return index;
}

/** "Cinco personas" -> 5, "1 bebe" -> 1, vacío -> 1. */
function parsePeopleCount(raw) {
  const text = normalize(raw);
  const digits = text.match(/\d+/);
  if (digits) return Math.max(1, Number(digits[0]));
  for (const [word, value] of Object.entries(WORD_NUMBERS)) {
    if (text.includes(word)) return value;
  }
  return 1;
}

/** "19/08/2026 18:26:07" -> Date local. */
function parseTimestamp(raw) {
  const match = (raw ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0),
  );
}

function toMysqlDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function isYes(raw) {
  const text = normalize(raw);
  return text.startsWith('si') || text.startsWith('yes');
}

function needsDiapers(raw) {
  const text = normalize(raw);
  return text !== '' && !text.includes('no necesito');
}

function hasTransport(raw) {
  return normalize(raw).startsWith('si');
}

function scope(raw) {
  return normalize(raw).includes('comunidad') ? 'comunidad' : 'familiar';
}

function clip(value, max) {
  const text = (value ?? '').trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function loadCsv() {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`No se pudo descargar el CSV (HTTP ${response.status})`);
    }
    return response.text();
  }
  return readFile(source, 'utf8');
}

async function main() {
  const rows = parseCsv(await loadCsv());
  if (rows.length < 2) {
    throw new Error('El CSV no tiene filas de datos');
  }
  const index = buildIndex(rows[0]);
  const records = [];

  for (const row of rows.slice(1)) {
    const at = row[index.timestamp];
    const value = (key) => row[index[key]] ?? '';
    const fullName = value('fullName').trim();
    if (!fullName) continue;

    const timestamp = parseTimestamp(at);
    const identification = value('identificationNumber').trim();
    records.push({
      externalRef: `sheet:${at.trim()}|${identification}`,
      fullName: clip(fullName, 255) ?? '',
      identificationNumber: clip(identification, 255) ?? '',
      residenceBefore: clip(value('residenceBefore'), 300) ?? '',
      residenceAfter: clip(value('residenceAfter'), 300) ?? '',
      phoneWhatsapp: clip(value('phoneWhatsapp'), 40) ?? '',
      affectationType: clip(value('affectationType'), 200) ?? '',
      clothingScope: scope(value('clothingScope')),
      peopleCount: parsePeopleCount(value('peopleCount')),
      hasOwnTransport: hasTransport(value('hasOwnTransport')),
      babySizes: clip(value('babySizes'), 200),
      girlShirtSizes: clip(value('girlShirtSizes'), 200),
      girlPantsSizes: clip(value('girlPantsSizes'), 200),
      womanShirtSizes: clip(value('womanShirtSizes'), 200),
      womanPantsSizes: clip(value('womanPantsSizes'), 200),
      boyShirtSizes: clip(value('boyShirtSizes'), 200),
      boyPantsSizes: clip(value('boyPantsSizes'), 200),
      manShirtSizes: clip(value('manShirtSizes'), 200),
      manPantsSizes: clip(value('manPantsSizes'), 200),
      underwearNeeds: clip(value('underwearNeeds'), 400),
      needsLinens: isYes(value('needsLinens')),
      needsDiapers: needsDiapers(value('needsDiapers')),
      needsSanitary: isYes(value('needsSanitary')),
      additionalNeeds: clip(value('additionalNeeds'), 2000),
      at: timestamp ? toMysqlDate(timestamp) : null,
    });
  }

  console.log(`Filas válidas en el CSV: ${records.length}`);
  if (dryRun) {
    console.table(
      records.map((record) => ({
        nombre: record.fullName,
        personas: record.peopleCount,
        destino: record.residenceAfter,
        fecha: record.at,
      })),
    );
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  let inserted = 0;
  let skipped = 0;
  try {
    for (const record of records) {
      const [existing] = await connection.execute(
        'SELECT id FROM help_requests WHERE external_ref = ? LIMIT 1',
        [record.externalRef],
      );
      if (existing.length) {
        skipped += 1;
        continue;
      }

      const [result] = await connection.execute(
        `INSERT INTO help_requests (
          full_name, identification_number, residence_before, residence_after, phone_whatsapp,
          affectation_type, clothing_scope, people_count, has_own_transport,
          baby_sizes, girl_shirt_sizes, girl_pants_sizes, woman_shirt_sizes, woman_pants_sizes,
          boy_shirt_sizes, boy_pants_sizes, man_shirt_sizes, man_pants_sizes, underwear_needs,
          needs_linens, needs_diapers, needs_sanitary, additional_needs,
          status, source, external_ref, internal_notes, ready_at, delivered_at, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          record.fullName,
          record.identificationNumber,
          record.residenceBefore,
          record.residenceAfter,
          record.phoneWhatsapp,
          record.affectationType,
          record.clothingScope,
          record.peopleCount,
          record.hasOwnTransport ? 1 : 0,
          record.babySizes,
          record.girlShirtSizes,
          record.girlPantsSizes,
          record.womanShirtSizes,
          record.womanPantsSizes,
          record.boyShirtSizes,
          record.boyPantsSizes,
          record.manShirtSizes,
          record.manPantsSizes,
          record.underwearNeeds,
          record.needsLinens ? 1 : 0,
          record.needsDiapers ? 1 : 0,
          record.needsSanitary ? 1 : 0,
          record.additionalNeeds,
          'entregado',
          'historial',
          record.externalRef,
          'Registro histórico importado del formulario de Google (antes de la plataforma).',
          record.at,
          record.at,
          record.at,
          record.at,
        ],
      );
      if (result.affectedRows) inserted += 1;
    }
  } finally {
    await connection.end();
  }

  console.log(`Importadas: ${inserted} · ya existían: ${skipped}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
