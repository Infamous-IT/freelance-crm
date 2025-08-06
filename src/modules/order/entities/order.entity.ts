import { ApiProperty } from '@nestjs/swagger';
import { Category, OrderStatus } from '@prisma/client';

export class Order {
  @ApiProperty({
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    description: 'Унікальний ідентифікатор замовлення (UUID)',
  })
  id: string;

  @ApiProperty({
    example: 'Написати функцію відображення всіх замовлень',
    description: 'Назва замовлення',
  })
  title: string;

  @ApiProperty({
    example:
      'Реалізація функціоналу відображення замовлень для авторизованого користувача.',
    description: 'Опис замовлення',
  })
  description: string;

  @ApiProperty({
    example: 5000,
    description: 'Вартість проєкту',
  })
  price: number;

  @ApiProperty({
    example: '26.01.2025',
    description: 'Початок роботи',
  })
  startDate: Date;

  @ApiProperty({
    example: '31.01.2025',
    description: 'Завершення роботи',
  })
  endDate: Date;

  @ApiProperty({
    example: 'BACKEND',
    description: 'Категорія проєкту',
  })
  category: Category;

  @ApiProperty({
    example: 'NEW | INPROGRESS | REJECTED | DONE',
    description: 'Статус замовлення',
  })
  status: OrderStatus;

  @ApiProperty({
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    description:
      'Унікальний ідентифікатор користувача, хто виконує замовлення (UUID)',
  })
  userId: string;

  @ApiProperty({
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    description:
      'Унікальний ідентифікатор замовника, хто дав замовлення (UUID)',
  })
  customerId?: string;
}
