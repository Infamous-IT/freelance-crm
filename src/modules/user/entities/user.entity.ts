import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import { UserSecureData } from '../interfaces/user.interface';

export class User {
  @ApiProperty({
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    description: 'Унікальний ідентифікатор користувача (UUID)',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'Nazar',
    description: 'Імʼя користувача',
  })
  @Expose()
  firstName: string;

  @ApiProperty({
    example: 'Hlukhaniuk',
    description: 'Прізвище користувача',
  })
  @Expose()
  lastName: string;

  @ApiProperty({
    example: 'Ukraine',
    description: 'Країна проживання користувача',
    required: false,
  })
  @Expose()
  country: string | null;

  @ApiProperty({
    example: 'nazar.hlukhaniuk@example.com',
    description: 'Електронна пошта користувача',
  })
  @Expose()
  email: string;

  @ApiProperty({
    example: 'securepassword123',
    description: 'Пароль користувача (мінімум 8 символів)',
  })
  @Exclude()
  password: string;

  @ApiProperty({
    example: true,
    description: 'Статус підтвердження електронної пошти',
  })
  @Expose()
  isEmailVerified: boolean | null;

  @ApiProperty({
    example: '2025-01-01',
    description: 'Дата створення користувача',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-10',
    description: 'Дата останнього оновлення користувача',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    example: 'FREELANCER',
    description: 'Роль користувача',
    enum: Role,
  })
  @Expose()
  role: Role;
}

export class UserSecure extends OmitType ( User, ['password'] ) implements UserSecureData {}