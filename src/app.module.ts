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
import { HealthController } from './health.controller.js';

function databaseOptions(config: ConfigService): TypeOrmModuleOptions {
  const dbType = config.get<string>('DB_TYPE', 'sqlite');
  if (dbType === 'mysql') {
    return {
      type: 'mysql',
      host: config.get<string>('DB_HOST', 'localhost'),
      port: Number(config.get('DB_PORT', 3306)),
      username: config.get<string>('DB_USER', 'root'),
      password: config.get<string>('DB_PASSWORD', ''),
      database: config.get<string>('DB_NAME', 'abrigar'),
      autoLoadEntities: true,
      synchronize: true,
      charset: 'utf8mb4',
      driver: mysql2,
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
