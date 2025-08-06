import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from 'src/modules/user/service/user.service';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../service/auth.service';
import { RolesGuard } from '../guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from '../decorators/roles.decorator';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { ChangePasswordResponse, ForgotPasswordResponse, LoginResponse, LogoutResponse, RefreshTokenResponse, RegisterResponse, SendVerificationCodeResponse, UpdatePasswordResponse, VerifyEmailResponse } from '../responses/auth.response';
import { TransformInterceptor } from 'src/app/interceptors/transform.interceptor';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { UpdatePasswordDto } from '../dtos/update-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { SendVerificationCodeDto } from '../dtos/send-verification-code.dto';
import { VerifyEmailDto } from '../dtos/verify-email.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

@Controller('auth')
export class AuthController extends AbstractController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super();
  }

  @Post('login')
  @UseInterceptors(TransformInterceptor)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    return this.transformToObject(result, LoginResponse);
  }

  @Post('register')
  @UseInterceptors(TransformInterceptor)
  async register(@Body() registerDto: RegisterDto) {
    const newUser = await this.authService.register(registerDto);
    const response = { message: 'Користувача успішно зареєстровано', user: newUser };
    return this.transformToObject(response, RegisterResponse);
  }

  @Post('refresh')
  @UseInterceptors(TransformInterceptor)
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    const payload = await this.authService.validateAccessToken(
      refreshDto.refreshToken,
    );
    const user = await this.userService.findOneOrThrow(payload.sub);
    const tokens = this.authService.generateTokens(user);
    return this.transformToObject(tokens, RefreshTokenResponse);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(TransformInterceptor)
  async logout(@Req() req: any) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    await this.authService.revokeAccessToken(accessToken);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const response = { message: 'Ви успішно вийшли з системи.' };
    return this.transformToObject(response, LogoutResponse);
  }

  // TODO: use current user
  @Post('verify-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  @UseInterceptors(TransformInterceptor)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(verifyEmailDto.email, verifyEmailDto.code);
    return this.transformToObject({ success: result }, VerifyEmailResponse);
  }

  // TODO: use current user
  @Post('send-verification-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  @UseInterceptors(TransformInterceptor)
  async sendVerificationCode(@Body() sendVerificationCodeDto: SendVerificationCodeDto) {
    await this.authService.sendVerificationCode(sendVerificationCodeDto.email);
    const response = { message: 'Код успішно відправлено на електронну пошту' };
    return this.transformToObject(response, SendVerificationCodeResponse);
  }

  @Post('forgot-password')
  @UseInterceptors(TransformInterceptor)
  async sendForgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.sendForgotPassword(forgotPasswordDto.email);
    return this.transformToObject(result, ForgotPasswordResponse);
  }

  // TODO: use current user
  @Post('update-password')
  @UseInterceptors(TransformInterceptor)
  async updateForgotPassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const result = await this.authService.updateForgotPassword(
      updatePasswordDto.email,
      updatePasswordDto.code,
      updatePasswordDto.newPassword,
    );
    return this.transformToObject({ user: result }, UpdatePasswordResponse);
  }

  // TODO: use current user
  @Post('change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  @UseInterceptors(TransformInterceptor)
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(
      req.user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );

    return this.transformToObject({ user: result }, ChangePasswordResponse);
  }
}
