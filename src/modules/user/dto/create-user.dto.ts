import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  Length,
} from 'class-validator';
import { CreateUser } from '../interfaces/user.interface';

export class CreateUserDto implements CreateUser {
  @ApiProperty({
    example: 'Nazar',
    description: 'Імʼя користувача',
  })
  @IsString()
  @Length(2, 50)
  firstName: string;

  @ApiProperty({
    example: 'Hlukhaniuk',
    description: 'Прізвище користувача',
  })
  @IsString()
  @Length(2, 50)
  lastName: string;

  @ApiProperty({
    example: 'Ukraine',
    description: 'Країна проживання користувача',
    required: false,
  })
  @IsOptional()
  country: string | null;

  @ApiProperty({
    example: 'nazar.hlukhaniuk@example.com',
    description: 'Електронна пошта користувача',
  })
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({
    example: 'securepassword123',
    description: 'Пароль користувача (мінімум 8 символів)',
  })
  @IsString()
  @Length(8, 100)
  password: string;

  @ApiProperty({
    example: true,
    description: 'Статус підтвердження електронної пошти',
  })
  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean | null;

  @ApiProperty({
    example: 'FREELANCER',
    description: 'Роль користувача',
    enum: Role,
  })
  @IsString()
  role: Role;
}
