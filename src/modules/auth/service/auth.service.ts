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
import { User } from 'src/modules/user/entities/user.entity';
import { UserService } from 'src/modules/user/service/user.service';
import { RegisterDto } from '../dtos/register.dto';
import { RedisClientType } from 'redis';
import logger from 'src/common/logger/logger';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

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
}
