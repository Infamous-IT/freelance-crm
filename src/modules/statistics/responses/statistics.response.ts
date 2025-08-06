import { Expose } from 'class-transformer';

export class UserCustomerStatsResponse {
  @Expose()
  totalCustomers: number;
}

export class UserOrderStatsResponse {
  @Expose()
  totalOrders: number;

  @Expose()
  totalEarnings: number;
}

export class TopExpensiveOrderResponse {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  price: number;
}

export class CustomerSpendingResponse {
  @Expose()
  customerId: string;

  @Expose()
  customerName: string;

  @Expose()
  totalSpending: number;
}

export class TopCustomerBySpendingResponse {
  @Expose()
  customerId: string;

  @Expose()
  customerName: string;

  @Expose()
  totalSpending: number;
}

export class TopCustomerByOrdersResponse {
  @Expose()
  customerId: string;

  @Expose()
  customerName: string;

  @Expose()
  totalOrders: number;
}

export class DashboardStatsResponse {
  @Expose()
  userStats: UserOrderStatsResponse;

  @Expose()
  orderStats: UserOrderStatsResponse;

  @Expose()
  customerStats: UserCustomerStatsResponse;

  @Expose()
  totalCustomers: number;

  @Expose()
  totalSpending: number;
}
