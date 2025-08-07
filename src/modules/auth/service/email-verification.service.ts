import { Injectable, NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { UserSecure } from 'src/modules/user/entities/user.entity';
import { DatabaseService } from 'src/database/service/database.service';
import logger from 'src/common/logger/logger';
import { EmailService } from './email.service';

@Injectable()
export class EmailVerificationService {
  private verificationCodes = new Map<string, string>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailSendingService: EmailService,
  ) {}

  async verifyEmail(email: string, code: string, currentUser: UserSecure): Promise<boolean> {
    if (currentUser.email !== email) {
      throw new ConflictException('Ви можете верифікувати тільки свій email');
    }

    const storedCode = this.verificationCodes.get(email);
    if (!storedCode) {
      logger.warn(`No verification code found for email ${email}`);
      throw new NotFoundException('Code for accepting was not found!');
    }

    if (storedCode !== code) {
      logger.warn(`Invalid verification code for email ${email}`);
      throw new ConflictException('Code is not valid!');
    }

    this.verificationCodes.delete(email);
    
    try {
      const updatedUser = await this.databaseService.user.update({
        where: { email },
        data: { isEmailVerified: true },
      });
  
      logger.info(`Email verified for ${email}`);
      return !!updatedUser;
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to verify email');
    }
  }

  async sendVerificationCode(email: string, currentUser: UserSecure): Promise<void> {
    if (currentUser.email !== email) {
      throw new ConflictException('Ви можете відправити код тільки на свій email');
    }

    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.verificationCodes.set(email, code);

      await this.emailSendingService.sendEmail(
        email,
        'Verification code',
        `Your verification code is: ${code}`,
      );
      logger.info(`Verification code sent to ${email}`);
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to send verification code');
    }
  }
}