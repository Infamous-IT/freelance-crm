import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/service/user.service';
import { RegisterDto } from '../dto/register.dto';
import { EmailService } from './email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisClientType } from 'redis';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  private forgotPasswordCodes = new Map<string, string>();

  async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.EXPIRATION_TIME_FOR_ACCESS_TOKEN,
      secret: process.env.JWT_SECRET_TOKEN,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.EXPIRATION_TIME_FOR_REFRESH_TOKEN,
      secret: process.env.JWT_REFRESH_TOKEN,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateAccessToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET_TOKEN,
      });
    } catch (error) {
      return null;
    }
  }

  async comparePassword(enteredPassword: string, storedPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, storedPassword);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Невірні облікові дані');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Невірні облікові дані');
    }

    return user;
  }

  async register(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Користувач з таким email вже існує');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const newUser = await this.userService.create({
      ...registerDto,
      password: hashedPassword,
    });

    return newUser;
  }

  async login(email: string, password: string): Promise<any> {
    const user = await this.validateUser(email, password);

    const tokens = await this.generateTokens(user);

    return {
        message: 'Авторизація пройшла успішно',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
    };
  }

  async revokeAccessToken(accessToken: string): Promise<void> {
    try {
      await this.redisClient.set(accessToken, 'revoked', { EX: 3600 });
    } catch (err) {
      throw err;
    }
  }

  async isAccessTokenRevoked(accessToken: string): Promise<boolean> {
    try {
      const result = await this.redisClient.get(accessToken);
      return result === 'revoked';
    } catch (err) {
      throw err;
    }
  }

  async getTokenTTL(token: string): Promise<number> {
    try {
      return await this.redisClient.ttl(token);
    } catch (err) {
      throw err;
    }
  }
  
  async verifyEmail(email: string, code: string): Promise<boolean> {
    const storedCode = this.forgotPasswordCodes.get(email);
    
    if (!storedCode) {
      throw new NotFoundException('Код для підтвердження не знайдено');
    }

    if(storedCode !== code) {
      throw new UnauthorizedException("Код не валідний!");
    }

    this.forgotPasswordCodes.delete(email);
    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    return !!updatedUser;
   }

  async sendVerificationCode(email: string): Promise<void> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    this.forgotPasswordCodes.set(email, code);

    await this.emailService.sendEmail(
      email,
      'Код підтвердження',
      `Ваш код підтвердження: ${code}`,
    );
  }

  async sendForgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);

    if(!user) {
      throw new UnauthorizedException("Користувача не знайдено!");
    }

    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.forgotPasswordCodes.set(email, code);

    await this.emailService.sendEmail(email, 'Код для відновлення паролю', `Ваш код: ${code}`);
    return { message: 'Код відправлено на вашу електронну адресу.' };
  }

  async updateForgotPassword(email: string, code: string, newPassword: string) {
    await this.verifyEmail(email, code);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await this.userService.findByEmail(email);
    user!.password = hashedPassword;

    return this.userService.update(user!.id, user!);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userService.findOne(userId);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Старий пароль неправильний');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    return this.userService.update(userId, user);
  }
}
