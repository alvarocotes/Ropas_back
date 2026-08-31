/**
 * Punto de entrada serverless (Vercel).
 *
 * Nest y TypeORM se cargan con import() dinámico: si se importan arriba del
 * archivo y fallan, Vercel mata la función antes de poder responder OPTIONS
 * y el navegador lo ve como error de CORS.
 */
let appPromise;

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, Origin, X-Requested-With',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

async function getExpressInstance() {
  const { createApp } = await import('../dist/bootstrap.js');
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
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
      applyCors(res);
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
