import { createApp } from '../dist/bootstrap.js';

/**
 * Punto de entrada serverless (Vercel). La aplicación se crea una sola vez por
 * instancia y se reutiliza en las siguientes invocaciones, de modo que la
 * conexión a MySQL no se abre en cada petición.
 *
 * CORS se aplica aquí (no solo en Nest): si la función falla al arrancar,
 * Vercel devolvería un HTML sin cabeceras y el navegador lo reporta como CORS.
 */
let appPromise;

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
  );
}

async function getExpressInstance() {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    appPromise ??= getExpressInstance().catch((err) => {
      appPromise = undefined;
      throw err;
    });
    const express = await appPromise;
    return express(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('ABRIGAR no pudo arrancar:', err);
    if (!res.headersSent) {
      applyCors(req, res);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          message: 'El servidor no pudo arrancar. Revisa las variables de Vercel y los logs.',
          detail: message,
        }),
      );
    }
  }
}
