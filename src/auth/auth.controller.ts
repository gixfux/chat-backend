import { Controller, Get, Post, Request, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @UseGuards(AuthGuard('local'))
  @Post('/login')
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('local'))
  @Post('/register')
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }
}
