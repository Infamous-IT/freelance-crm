import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
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
  async logout(@Req() req: any) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    await this.authService.revokeAccessToken(accessToken);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    return { message: 'Ви успішно вийшли з системи.' };
  }
  
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmail(body.email, body.code);
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body() body: { email: string }) {
    await this.authService.sendVerificationCode(body.email);
    return { message: 'Код успішно відправлено на електронну пошту' };
  }

  @Post('forgot-password')
  async sendForgotPassword(@Body() body: { email: string }) {
    return this.authService.sendForgotPassword(body.email);
  }

  @Post('update-password')
  async updateForgotPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.authService.updateForgotPassword(body.email, body.code, body.newPassword);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.id, body.oldPassword, body.newPassword);
  }
}
