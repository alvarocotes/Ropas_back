import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

interface ResponseLike {
  setHeader(name: string, value: string): void;
}

/**
 * Lecturas públicas que puede guardar la CDN: se recalculan como máximo una vez
 * por minuto y así las páginas abiertas no esperan a que arranque la función.
 */
const CACHEABLE_PATHS = new Set([
  '/api/needs',
  '/api/stats/volunteers-count',
  '/api/about/sections',
  '/api/about/impact',
]);

/**
 * Crea la aplicación Nest con toda su configuración, sin ponerla a escuchar.
 * La usan el arranque local (main.ts) y la función serverless (api/index.js).
 */
export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use((req: { method: string; path: string }, res: ResponseLike, next: () => void) => {
    if (req.method === 'GET' && CACHEABLE_PATHS.has(req.path)) {
      res.setHeader(
        'Cache-Control',
        'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      );
    }
    next();
  });
  // Cualquier origen. El JWT va en Authorization; no hay cookies de sesión,
  // así que credentials queda en false y se puede usar '*'.
  app.enableCors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  return app;
}
