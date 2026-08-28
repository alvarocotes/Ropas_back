import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/**
 * Crea la aplicación Nest con toda su configuración, sin ponerla a escuchar.
 * La usan el arranque local (main.ts) y la función serverless (api/index.js).
 */
export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // Acepta peticiones desde cualquier origen: la API se autentica con el token
  // JWT en la cabecera Authorization, no con cookies de sesión.
  app.enableCors({ origin: true, credentials: true });
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
