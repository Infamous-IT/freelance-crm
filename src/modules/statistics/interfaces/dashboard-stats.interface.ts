import { CustomerStats } from './customer-stats.interface';
import { OrderStats } from './order-stats.interface';
import { UserStats } from './user-stats.interface';

export interface DashboardStats {
    userStats: UserStats;
    orderStats: OrderStats;
    customerStats: CustomerStats;
    totalCustomers: number;
    totalSpending: number;
  }