import { Category, OrderStatus } from '@prisma/client';
import { Order } from '../entities/order.entity';
import { Expose } from 'class-transformer';

export class OrderResponse extends Order {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  price: number;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  category: Category;

  @Expose()
  status: OrderStatus;

  @Expose()
  userId: string;

  @Expose()
  //TODO: Add UserResponse + @Type
  user?: any;

  @Expose()
  //TODO: Add CustomerResponse + @Type
  customers?: any[];
}