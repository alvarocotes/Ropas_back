import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CreateAttendanceDto } from '../users/dto/create-attendance.dto.js';
import { UpdateAvailabilityDto } from '../users/dto/update-availability.dto.js';
import { UpdateProfileDto } from '../users/dto/update-profile.dto.js';
import type { SafeUser } from '../users/users.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: SafeUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: SafeUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('me/availability')
  updateAvailability(@CurrentUser() user: SafeUser, @Body() dto: UpdateAvailabilityDto) {
    return this.usersService.replaceAvailability(user.id, dto.slots);
  }

  @Get('me/attendance')
  listAttendance(@CurrentUser() user: SafeUser) {
    return this.usersService.listAttendance(user.id);
  }

  @Post('me/attendance')
  addAttendance(@CurrentUser() user: SafeUser, @Body() dto: CreateAttendanceDto) {
    return this.usersService.addAttendance(user.id, dto);
  }

  @Delete('me/attendance/:id')
  removeAttendance(
    @CurrentUser() user: SafeUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.removeAttendance(user.id, id);
  }
}
