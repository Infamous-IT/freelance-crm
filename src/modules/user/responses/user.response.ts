import { Role } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { OrderResponse } from 'src/modules/order/responses/order.response';
import { User } from '../entities/user.entity';

export class UserResponse extends User {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  country: string | null;

  @Expose()
  email: string;

  @Expose()
  isEmailVerified: boolean | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  role: Role;

  @Expose()
  @Type(() => OrderResponse)
  orders?: OrderResponse[];
}