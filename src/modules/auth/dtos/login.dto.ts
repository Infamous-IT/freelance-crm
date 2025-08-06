import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'nazar.hlukhaniuk@example.com',
    description: 'Електронна пошта користувача',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(8)
  @ApiProperty({
    example: 'securepassword123',
    description: 'Пароль користувача (мінімум 8 символів)',
  })
  password: string;
}
