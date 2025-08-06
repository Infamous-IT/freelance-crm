import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendVerificationCodeDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
