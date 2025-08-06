import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/modules/user/user.module';
import { AuthController } from './controller/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './service/auth.service';
import { EmailService } from './service/email.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UserModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_TOKEN,
      signOptions: { expiresIn: process.env.EXPIRATION_TIME_FOR_ACCESS_TOKEN },
    }),
    RedisModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
    EmailService,
    RolesGuard
  ],
  controllers: [AuthController],
  exports: [
    AuthService, 
    EmailService, 
    RolesGuard, 
    JwtModule
  ],
})
export class AuthModule {}
