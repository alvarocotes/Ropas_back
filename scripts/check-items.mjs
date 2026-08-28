/**
 * Diagnóstico: muestra el estado de una solicitud y las prendas de su paquete.
 * Uso: node scripts/check-items.mjs 24
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.trimStart().startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const id = process.argv[2];
const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

const [requests] = await connection.query(
  'SELECT id, status, people_count, manual_items_delivered, latitude FROM help_requests WHERE id = ?',
  [id],
);
console.log('solicitud:', requests[0]);

const [items] = await connection.query(
  'SELECT product_name, quantity FROM help_request_items WHERE help_request_id = ?',
  [id],
);
console.log('items del paquete:', items);

await connection.end();
