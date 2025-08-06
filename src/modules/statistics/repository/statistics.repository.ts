import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/service/database.service';
import { CustomerSpendingResponse, DashboardStatsResponse, TopCustomerByOrdersResponse, TopCustomerBySpendingResponse, TopExpensiveOrderResponse, UserCustomerStatsResponse, UserOrderStatsResponse } from '../responses/statistics.response';

@Injectable()
export class StatisticsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getUserCustomerStats(userId: string): Promise<number> {
    const orders = await this.databaseService.order.findMany({
      where: { userId },
      include: { customers: true },
    });

    const uniqueCustomers = new Set(
      orders
        .flatMap((order) => order.customers?.map((customer) => customer.id))
        .filter((id) => id != null),
    );
    return uniqueCustomers.size;
  }

  async getUserOrderStats(userId: string): Promise<UserOrderStatsResponse> {
    const stats = await this.databaseService.order.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { price: true },
    });

    return {
      totalOrders: stats._count.id,
      totalEarnings: stats._sum.price ?? 0,
    };
  }

  async getTopExpensiveOrders(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<TopExpensiveOrderResponse[]> {
    return this.databaseService.order.findMany({
      where: isAdmin ? {} : { userId },
      orderBy: { price: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        price: true,
      },
    });
  }

  async getCustomerSpending(
    userId: string,
    isAdmin: boolean,
  ): Promise<CustomerSpendingResponse[]> {
    const customers = await this.databaseService.customer.findMany({
      where: isAdmin ? {} : { order: { some: { userId } } },
      select: {
        id: true,
        fullName: true,
        order: {
          select: { price: true },
        },
      },
    });

    return customers.map((customer) => ({
      customerId: customer.id,
      customerName: customer.fullName,
      totalSpending: customer.order.reduce(
        (sum, order) => sum + order.price,
        0,
      ),
    }));
  }

  async getTopCustomersBySpending(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<TopCustomerBySpendingResponse[]> {
    const spendingData = await this.databaseService.order.findMany({
      where: isAdmin ? {} : { userId },
      select: {
        price: true,
        customers: { select: { id: true } },
      },
    });

    const customerSpendingMap = new Map<string, number>();
    spendingData.forEach((order) => {
      order.customers.forEach((customer) => {
        const prevSpending = customerSpendingMap.get(customer.id) || 0;
        customerSpendingMap.set(
          customer.id,
          prevSpending + Number(order.price),
        );
      });
    });

    const topCustomerIds = [...customerSpendingMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([customerId]) => customerId);

    const customers = await this.databaseService.customer.findMany({
      where: { id: { in: topCustomerIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    return customers.map((customer) => ({
      customerId: customer.id,
      customerName: customer.fullName,
      totalSpending: customerSpendingMap.get(customer.id) || 0,
    }));
  }

  async getTopCustomersByOrders(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<TopCustomerByOrdersResponse[]> {
    const customers = await this.databaseService.customer.findMany({
      where: isAdmin ? {} : { order: { some: { userId } } },
      select: {
        id: true,
        fullName: true,
        _count: { select: { order: true } },
      },
    });

    return customers.map((customer) => ({
      customerId: customer.id,
      customerName: customer.fullName,
      totalOrders: customer._count.order,
    }));
  }

  async getDashboardStats(userId: string, isAdmin: boolean): Promise<DashboardStatsResponse> {
    const [userCustomerStats, userOrderStats, customerSpending] = await Promise.all([
      this.getUserCustomerStats(userId),
      this.getUserOrderStats(userId),
      this.getCustomerSpending(userId, isAdmin),
    ]);

    const userStats: UserOrderStatsResponse = {
      totalOrders: userOrderStats.totalOrders,
      totalEarnings: userOrderStats.totalEarnings,
    };

    const customerStats: UserCustomerStatsResponse = {
      totalCustomers: userCustomerStats,
    };

    const orderStats: UserOrderStatsResponse = {
      totalOrders: userOrderStats.totalOrders,
      totalEarnings: userOrderStats.totalEarnings,
    };

    return {
      userStats,
      orderStats,
      customerStats,
      totalCustomers: customerSpending.length,
      totalSpending: customerSpending.reduce(
        (sum, customer) => sum + customer.totalSpending,
        0,
      ),
    };
  }
}