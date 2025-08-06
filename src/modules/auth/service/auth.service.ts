import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User, UserSecure } from 'src/modules/user/entities/user.entity';
import { UserService } from 'src/modules/user/service/user.service';
import { RegisterDto } from '../dtos/register.dto';
import { EmailService } from './email.service';
import { RedisClientType } from 'redis';
import logger from 'src/common/logger/logger';
import { DatabaseService } from 'src/database/service/database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly databaseService: DatabaseService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  private forgotPasswordCodes = new Map<string, string>();

  generateTokens(user: User) {
    try {
      const payload = { sub: user.id, email: user.email };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.EXPIRATION_TIME_FOR_ACCESS_TOKEN,
        secret: process.env.JWT_SECRET_TOKEN,
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: process.env.EXPIRATION_TIME_FOR_REFRESH_TOKEN,
        secret: process.env.JWT_REFRESH_TOKEN,
      });

      logger.info(
        `Generated access token and refresh token for user: ${user.email}`,
      );
      return {
        accessToken,
        refreshToken,
      };
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to generate access and refresh tokens' );
    }
  }

  validateAccessToken(token: string) {
    try {
      logger.info(`Validating access token: ${token}`);
      return this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET_TOKEN,
      });
    } catch ( err: unknown ) {
      return null;
    }
  }

  async comparePassword(
    enteredPassword: string,
    storedPassword: string,
  ): Promise<boolean> {
    logger.info('Comparing passwords');
    return await bcrypt.compare(enteredPassword, storedPassword);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      logger.warn(`User with email ${email} not found`);
      throw new UnauthorizedException('Невірні облікові дані');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Invalid password for user ${email}`);
      throw new UnauthorizedException('Невірні облікові дані');
    }

    logger.info(`User validated: ${email}`);
    return user;
  }

  async register(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      logger.warn(`User with email ${registerDto.email} already exists`);
      throw new ConflictException('Користувач з таким email вже існує');
    }

    try {
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      const newUser = await this.userService.create({
        ...registerDto,
        password: hashedPassword,
      });

      logger.info(`New user registered: ${newUser.email}`);
      return newUser;
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to register user' );
    }
  }

  async login(email: string, password: string): Promise<any> {
    try {
      logger.info(`Login attempt for user: ${email}`);
      const user = await this.validateUser(email, password);
      const tokens = this.generateTokens(user);

      return {
        message: 'Авторизація пройшла успішно',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch ( err: unknown ) {
      throw new ConflictException( 'Bad credentials' );
    }
  }

  async revokeAccessToken(accessToken: string): Promise<void> {
    try {
      logger.info(`Revoking access token: ${accessToken}`);
      await this.redisClient.set(accessToken, 'revoked', { EX: 3600 });
    } catch ( err: unknown ) {
      logger.error('Error revoking access token', { error: err });
      throw new UnprocessableEntityException( 'Error revoking access token' );
    }
  }

  async isAccessTokenRevoked(accessToken: string): Promise<boolean> {
    try {
      logger.info(`Checking if access token is revoked: ${accessToken}`);
      const result = await this.redisClient.get(accessToken);
      return result === 'revoked';
    } catch ( err: unknown ) {
      logger.error('Error checking token revocation', { error: err });
      throw new UnprocessableEntityException( 'Error checking token revocation' );
    }
  }

  async getTokenTTL(token: string): Promise<number> {
    try {
      logger.info(`Getting TTL for token: ${token}`);
      return await this.redisClient.ttl(token);
    } catch ( err: unknown ) {
      logger.error('Error getting TTL for token', { error: err });
      throw new UnprocessableEntityException( 'Error getting TTL for token' );
    }
  }

  async verifyEmail(email: string, code: string): Promise<boolean> {
    const storedCode = this.forgotPasswordCodes.get(email);

    if (!storedCode) {
      logger.warn(`No verification code found for email ${email}`);
      throw new NotFoundException('Code for accepting was not found!');
    }

    if (storedCode !== code) {
      logger.warn(`Invalid verification code for email ${email}`);
      throw new ConflictException('Code is not valid!');
    }

    this.forgotPasswordCodes.delete(email);
    try {
      const updatedUser = await this.databaseService.user.update({
        where: { email },
        data: { isEmailVerified: true },
      });
  
      logger.info(`Email verified for ${email}`);
      return !!updatedUser;
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to verify email' );
    }
  }

  async sendVerificationCode(email: string): Promise<void> {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      this.forgotPasswordCodes.set(email, code);

      await this.emailService.sendEmail(
        email,
        'Verification code',
        `Your verification code is: ${code}`,
      );
      logger.info(`Verification code sent to ${email}`);
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to send verificaiton code' );
    }
  }

  async sendForgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      logger.warn(`User with email ${email} not found for password reset`);
      throw new NotFoundException('User was not found!');
    }

    try {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.forgotPasswordCodes.set(email, code);

      await this.emailService.sendEmail(
        email,
        'Code for restore password',
        `Your verification code: ${code}`,
      );
      logger.info(`Password reset code sent to ${email}`);
      return { message: 'Code was send to your email.' };
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to send forgot password' );
    }
  }

  async updateForgotPassword(email: string, code: string, newPassword: string) {
    await this.verifyEmail(email, code);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await this.userService.findByEmail(email);
    
    if (!user) {
      throw new NotFoundException('User was not found');
    }

    try {
      const currentUser: UserSecure = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        country: user.country,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role,
      };
  
      logger.info(`Password updated for ${email}`);
      return this.userService.update(user.id, { password: hashedPassword }, currentUser);
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to update forgot password' );
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userService.findOneOrThrow(userId);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      logger.warn(`Old password incorrect for user ${userId}`);
      throw new UnauthorizedException('Старий пароль неправильний');
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const currentUser: UserSecure = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        country: user.country,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role,
      };
  
      logger.info(`Password changed for user ${userId}`);
      return this.userService.update(userId, { password: hashedPassword }, currentUser);
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to change password' );
    }
  }
}
