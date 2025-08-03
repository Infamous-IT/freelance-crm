import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import logger from 'src/common/logger/logger';
import { SentMessageInfo } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  async sendEmail(
    to: string,
    subject: string,
    text: string,
  ): Promise<SentMessageInfo> {
    logger.info(`Sending email to ${to} with subject ${subject}`);
    try {
      return await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
      });
    } catch (error) {
      logger.error(`Error sending email to ${to}`, { error });
      throw error;
    }
  }
}
