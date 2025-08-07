import { Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserService } from 'src/modules/user/service/user.service';
import { UserSecure } from 'src/modules/user/entities/user.entity';
import logger from 'src/common/logger/logger';
import { EmailService } from './email.service';

@Injectable()
export class PasswordService {
  private resetCodes = new Map<string, string>();

  constructor(
    private readonly userService: UserService,
    private readonly emailSendingService: EmailService,
  ) {}

  async sendForgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      logger.warn(`User with email ${email} not found for password reset`);
      throw new NotFoundException('User was not found!');
    }

    try {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.resetCodes.set(email, code);

      await this.emailSendingService.sendEmail(
        email,
        'Code for restore password',
        `Your verification code: ${code}`,
      );
      logger.info(`Password reset code sent to ${email}`);
      return { message: 'Code was send to your email.' };
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to send forgot password');
    }
  }

  async updateForgotPassword(email: string, code: string, newPassword: string) {
    const storedCode = this.resetCodes.get(email);
    if (!storedCode || storedCode !== code) {
      throw new NotFoundException('Invalid or expired code');
    }

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User was not found');
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

      this.resetCodes.delete(email);
      logger.info(`Password updated for ${email}`);
      return this.userService.update(user.id, { password: hashedPassword }, currentUser);
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to update password');
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
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
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to change password');
    }
  }
}