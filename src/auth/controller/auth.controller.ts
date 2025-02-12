import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserService } from 'src/user/service/user.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import logger from 'src/logger/logger';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly userService: UserService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      logger.info(`Login attempt for email: ${loginDto.email}`);
      const result = await this.authService.login(loginDto.email, loginDto.password);
      logger.info(`Login successful for email: ${loginDto.email}`);
      return result;
    } catch (error) {
      logger.error(`Login failed for email: ${loginDto.email}`, { error });
      throw new UnauthorizedException('Невірні облікові дані');
    }
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    logger.info(`Registration attempt for email: ${registerDto.email}`);
    const newUser = await this.authService.register(registerDto);
    logger.info(`User successfully registered with email: ${registerDto.email}`);
    return { message: 'Користувача успішно зареєстровано', user: newUser };
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: { refreshToken: string }) {
    logger.info(`Refreshing tokens for refreshToken: ${refreshDto.refreshToken}`);
    const payload = await this.authService.validateAccessToken(refreshDto.refreshToken);
    if (!payload) {
      logger.warn(`Invalid refresh token: ${refreshDto.refreshToken}`);
      throw new UnauthorizedException('Не дійсний Refresh Token');
    }
    const user = await this.userService.findOne(payload.sub);
    logger.info(`Tokens refreshed successfully for user: ${user.email}`);
    return this.authService.generateTokens(user);
  }
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    logger.info(`Logout request for accessToken: ${accessToken}`);
    await this.authService.revokeAccessToken(accessToken);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    logger.info(`User successfully logged out with accessToken: ${accessToken}`);
    return { message: 'Ви успішно вийшли з системи.' };
  }
  
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; code: string }) {
    logger.info(`Email verification attempt for email: ${body.email}`);
    const result = await this.authService.verifyEmail(body.email, body.code);
    if (result) {
      logger.info(`Email verified successfully for ${body.email}`);
    }
    return result;
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body() body: { email: string }) {
    logger.info(`Sending verification code to email: ${body.email}`);
    await this.authService.sendVerificationCode(body.email);
    logger.info(`Verification code sent to ${body.email}`);
    return { message: 'Код успішно відправлено на електронну пошту' };
  }

  @Post('forgot-password')
  async sendForgotPassword(@Body() body: { email: string }) {
    logger.info(`Forgot password request for email: ${body.email}`);
    const result = await this.authService.sendForgotPassword(body.email);
    logger.info(`Password reset code sent to email: ${body.email}`);
    return result;
  }

  @Post('update-password')
  async updateForgotPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    logger.info(`Updating password for email: ${body.email}`);
    const result = await this.authService.updateForgotPassword(body.email, body.code, body.newPassword);
    logger.info(`Password successfully updated for email: ${body.email}`);
    return result;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req, @Body() body: { oldPassword: string; newPassword: string }) {
    logger.info(`Password change request for user: ${req.user.id}`);
    const result = await this.authService.changePassword(req.user.id, body.oldPassword, body.newPassword);
    logger.info(`Password successfully changed for user: ${req.user.id}`);
    return result;
  }
}
