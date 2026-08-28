/**
 * Registra una jornada masiva del historial (una entrega colectiva, no una familia).
 *
 * Uso:
 *   node scripts/add-jornada.mjs --nombre "Jornada Parque Olaya" --personas 2500 \
 *     --lugar "Parque Olaya, Pereira" --desde 2026-08-10 --hasta 2026-08-18 [--dry-run]
 *
 * Queda como una solicitud entregada con source='historial'. Es idempotente: la
 * referencia se arma con el lugar y la fecha inicial, así que repetir el comando
 * no duplica el registro.
 */
import process from 'node:process';
import 'dotenv/config';
import mysql from 'mysql2/promise';

function readArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (key.startsWith('--')) {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function slug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const args = readArgs(process.argv.slice(2));
const name = args.nombre;
const place = args.lugar;
const people = Number(args.personas);
const from = args.desde;
const to = args.hasta ?? args.desde;

if (!name || !place || !Number.isFinite(people) || people < 1 || !from) {
  console.error('Faltan datos. Ver el encabezado del archivo para el uso correcto.');
  process.exit(1);
}

const record = {
  externalRef: `jornada:${slug(place)}:${from}`,
  fullName: name,
  residenceAfter: place,
  peopleCount: Math.round(people),
  notes:
    from === to
      ? `Jornada colectiva del ${from} en ${place}. Registro histórico previo a la plataforma.`
      : `Jornada colectiva del ${from} al ${to} en ${place}. Registro histórico previo a la plataforma.`,
  startedAt: `${from} 08:00:00`,
  finishedAt: `${to} 18:00:00`,
};

console.log(record);
if (args.dryRun) {
  process.exit(0);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  const [existing] = await connection.execute(
    'SELECT id FROM help_requests WHERE external_ref = ? LIMIT 1',
    [record.externalRef],
  );
  if (existing.length) {
    console.log(`Ya estaba registrada (solicitud #${existing[0].id}).`);
  } else {
    const [result] = await connection.execute(
      `INSERT INTO help_requests (
        full_name, identification_number, residence_before, residence_after, phone_whatsapp,
        affectation_type, clothing_scope, people_count, has_own_transport,
        needs_linens, needs_diapers, needs_sanitary,
        status, source, external_ref, internal_notes, ready_at, delivered_at, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        record.fullName,
        '',
        '',
        record.residenceAfter,
        '',
        'Jornada comunitaria por el sismo',
        'comunidad',
        record.peopleCount,
        0,
        0,
        0,
        0,
        'entregado',
        'historial',
        record.externalRef,
        record.notes,
        record.finishedAt,
        record.finishedAt,
        record.startedAt,
        record.finishedAt,
      ],
    );
    console.log(`Registrada como solicitud #${result.insertId}.`);
  }
} finally {
  await connection.end();
}
