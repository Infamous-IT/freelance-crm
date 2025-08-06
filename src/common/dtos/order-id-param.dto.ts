import { IsUUID } from 'class-validator';

export class OrderIdParamDto {
  @IsUUID()
  orderId: string;
}
