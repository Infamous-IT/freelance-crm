import { Expose, Type } from 'class-transformer';
import { Customer } from '../entities/customer.entity';
import { OrderResponse } from 'src/modules/order/responses/order.response';

export class CustomerResponse extends Customer {
  @Expose()
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  email?: string | null;

  @Expose()
  telegram?: string | null; 

  @Expose()
  company?: string | null;

  @Expose()
  orderIds?: string[];

  @Expose()
  @Type( () => OrderResponse )
  order?: OrderResponse[];
}
