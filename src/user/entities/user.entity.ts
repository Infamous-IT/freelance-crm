import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";

export class User {
    @ApiProperty({
        example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
        description: 'Унікальний ідентифікатор користувача (UUID)',
      })
    id: string;

    @ApiProperty({
        example: 'Nazar',
        description: 'Імʼя користувача',
      })
    firstName: string;

    @ApiProperty({
        example: 'Hlukhaniuk',
        description: 'Прізвище користувача',
      })
    lastName: string;

    @ApiProperty({
        example: 'Ukraine',
        description: 'Країна проживання користувача',
        required: false,
      })
    country: string | null;

    @ApiProperty({
        example: 'nazar.hlukhaniuk@example.com',
        description: 'Електронна пошта користувача',
      })
    email: string;

    @ApiProperty({
        example: 'securepassword123',
        description: 'Пароль користувача (мінімум 8 символів)',
      })
    password: string;

    @ApiProperty({
        example: true,
        description: 'Статус підтвердження електронної пошти',
      })
    isEmailVerified: boolean | null;

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
    role: Role;
}
