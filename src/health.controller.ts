import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator.js';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { ok: true, name: 'Entretejidos' };
  }
}
