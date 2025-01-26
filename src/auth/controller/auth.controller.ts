import { Body, Controller, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserService } from 'src/user/service/user.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly userService: UserService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto.email, loginDto.password);
      return result;
    } catch (error) {
      throw new UnauthorizedException('Невірні облікові дані');
    }
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const newUser = await this.authService.register(registerDto);
    return { message: 'Користувача успішно зареєстровано', user: newUser };
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: { refreshToken: string }) {
    const payload = await this.authService.validateAccessToken(refreshDto.refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Не дійсний Refresh Token');
    }
    const user = await this.userService.findOne(payload.sub);
    return this.authService.generateTokens(user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    return { message: 'Logout successful' };
  }
}
