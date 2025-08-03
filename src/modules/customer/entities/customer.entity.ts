import { ApiProperty } from '@nestjs/swagger';
import { Order } from '@prisma/client';

export class Customer {
  @ApiProperty({
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    description: 'Унікальний ідентифікатор замовника (UUID)',
  })
  id: string;

  @ApiProperty({
    example: 'Nazar Замовник',
    description: 'Імʼя та прізвище замовника',
  })
  fullName: string;

  @ApiProperty({
    example: 'test@gmail.com',
    description: 'Електронна адреса замовника',
  })
  email: string | null;

  @ApiProperty({
    example: 't.me/test',
    description: 'Телеграм замовника',
  })
  telegram: string | null; 

  @ApiProperty({
    example: 'Test IT Solution',
    description: 'Компанія замовника',
  })
  company: string | null;

  @ApiProperty({
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    description: 'Унікальний ідентифікатор замовлення',
  })
  orderIds?: string[];

  @ApiProperty()
  order?: Order[];
}
