import { SetMetadata } from '@nestjs/common';
import { AppModule } from '../enums.js';

export const MODULES_KEY = 'modules';
export const ANY_MODULES_KEY = 'any_modules';
export const Modules = (...modules: AppModule[]) => SetMetadata(MODULES_KEY, modules);
export const AnyModules = (...modules: AppModule[]) => SetMetadata(ANY_MODULES_KEY, modules);
