import { SetMetadata } from '@nestjs/common';
import { AppModule } from '../enums.js';

export const MODULES_KEY = 'modules';
export const Modules = (...modules: AppModule[]) => SetMetadata(MODULES_KEY, modules);
