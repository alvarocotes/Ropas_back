import { createApp } from '../dist/bootstrap.js';

/**
 * Punto de entrada serverless (Vercel). La aplicación se crea una sola vez por
 * instancia y se reutiliza en las siguientes invocaciones, de modo que la
 * conexión a MySQL no se abre en cada petición.
 */
let appPromise;

async function getExpressInstance() {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req, res) {
  appPromise ??= getExpressInstance();
  const express = await appPromise;
  return express(req, res);
}
