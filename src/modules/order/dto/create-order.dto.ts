import { ApiProperty } from '@nestjs/swagger';
import { Category, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { CreateOrder } from '../interfaces/order.interface';

export class CreateOrderDto implements CreateOrder {
  @ApiProperty({
    example: 'Написати функцію відображення всіх замовлень',
    description: 'Назва замовлення',
  })
  @IsString()
  @Length(5, 200)
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Реалізація функціоналу відображення замовлень для авторизованого користувача.',
    description: 'Опис замовлення',
  })
  @IsString()
  @Length(10, 1500)
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 5000,
    description: 'Вартість проєкту',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price: number;

  @ApiProperty({
    example: '26.01.2025',
    description: 'Початок роботи',
  })
  @IsString()
  startDate: string;

  @ApiProperty({
    example: '31.01.2025',
    description: 'Завершення роботи',
  })
  @IsString()
  endDate: string;

  @ApiProperty({
    example: 'BACKEND',
    description: 'Категорія проєкту',
  })
  @IsString()
  @IsNotEmpty()
  category: Category;

  @ApiProperty({
    example: 'NEW | INPROGRESS | REJECTED | DONE',
    description: 'Статус замовлення',
  })
  @IsString()
  @IsNotEmpty()
  status: OrderStatus;

  @ApiProperty({
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    description:
      'Унікальний ідентифікатор замовника, хто дав замовлення (UUID)',
  })
  @IsOptional()
  customerId?: string;
}
