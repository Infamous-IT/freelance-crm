import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class RegisterDto {
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
        example: '2025-01-01',
        description: 'Дата створення користувача',
      })
    createdAt: Date;

    @ApiProperty({
        example: '2025-01-10',
        description: 'Дата останнього оновлення користувача',
      })
    updatedAt: Date;

    @ApiProperty({
        example: 'FREELANCER',
        description: 'Роль користувача',
        enum: Role,
      })
    @IsString()
    role: Role;
}
