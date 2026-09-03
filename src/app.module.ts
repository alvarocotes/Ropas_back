import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';
// Import explícito del driver: TypeORM lo carga con require() dinámico y los
// empaquetadores de despliegue (Lambda, Vercel) no lo detectan, dejándolo fuera.
import mysql2 from 'mysql2';
import { AuthModule } from './auth/auth.module.js';
import { DonationsModule } from './donations/donations.module.js';
import { HelpRequestsModule } from './help-requests/help-requests.module.js';
import { AboutModule } from './about/about.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { NeedsModule } from './needs/needs.module.js';
import { StatsModule } from './stats/stats.module.js';
import { UsersModule } from './users/users.module.js';
import { TimeVolunteersModule } from './time-volunteers/time-volunteers.module.js';
import { ShiftLogsModule } from './shift-logs/shift-logs.module.js';
import { HealthController } from './health.controller.js';

function databaseOptions(config: ConfigService): TypeOrmModuleOptions {
  const onVercel = Boolean(process.env.VERCEL);
  const dbType = config.get<string>('DB_TYPE', onVercel ? 'mysql' : 'sqlite');
  if (onVercel && dbType !== 'mysql') {
    throw new Error('En Vercel hay que definir DB_TYPE=mysql');
  }
  if (dbType === 'mysql') {
    const host = config.get<string>('DB_HOST', 'localhost');
    const remote = host !== 'localhost' && host !== '127.0.0.1';
    return {
      type: 'mysql',
      host,
      port: Number(config.get('DB_PORT', 3306)),
      username: config.get<string>('DB_USER', 'root'),
      password: config.get<string>('DB_PASSWORD', ''),
      database: config.get<string>('DB_NAME', 'abrigar'),
      autoLoadEntities: true,
      // Solo se activa a propósito (DB_SYNC=true, en desarrollo): comparar el
      // esquema tarda unos segundos y se pagaría en cada arranque en frío.
      synchronize: config.get<string>('DB_SYNC', 'false') === 'true',
      charset: 'utf8mb4',
      driver: mysql2,
      // Hostinger y otros MySQL remotos suelen exigir TLS desde Vercel.
      ssl: remote ? { rejectUnauthorized: false } : undefined,
      // Fallar rápido en lugar de reintentar diez veces y agotar el tiempo de la función.
      retryAttempts: remote ? 5 : 2,
      retryDelay: remote ? 2000 : 1000,
      // MySQL compartido (Hostinger) cierra conexiones idle; keep-alive y
      // reciclar el pool evitan ECONNRESET / ETIMEDOUT al volver a consultar.
      extra: {
        connectionLimit: 3,
        connectTimeout: remote ? 20000 : 10000,
        waitForConnections: true,
        queueLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10_000,
        idleTimeout: remote ? 25_000 : 60_000,
        maxIdle: 2,
      },
    };
  }
  return {
    type: 'better-sqlite3',
    database: join(process.cwd(), 'abrigar.sqlite'),
    autoLoadEntities: true,
    synchronize: true,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseOptions,
    }),
    UsersModule,
    AuthModule,
    InventoryModule,
    DonationsModule,
    HelpRequestsModule,
    NeedsModule,
    StatsModule,
    AboutModule,
    TimeVolunteersModule,
    ShiftLogsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
