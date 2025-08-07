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
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { 
  LoginResponse, 
  LogoutResponse, 
  RefreshTokenResponse, 
  RegisterResponse
} from '../responses/auth.response';
import { TransformInterceptor } from 'src/app/interceptors/transform.interceptor';
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
}
