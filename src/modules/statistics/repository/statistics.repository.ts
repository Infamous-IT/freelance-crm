import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/service/database.service';

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

  async getUserOrderStats(userId: string): Promise<{
    totalOrders: number;
    totalEarnings: number;
  }> {
    const stats = await this.databaseService.order.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { price: true },
    });

    return {
      totalOrders: stats._count.id,
      totalEarnings: stats._sum.price?.toNumber() ?? 0,
    };
  }

  async getTopExpensiveOrders(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<any[]> {
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
  ): Promise<any[]> {
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
      id: customer.id,
      fullName: customer.fullName,
      totalSpending: customer.order.reduce(
        (sum, order) => sum + order.price.toNumber(),
        0,
      ),
    }));
  }

  async getTopCustomersBySpending(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<any[]> {
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
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      totalSpending: customerSpendingMap.get(customer.id) || 0,
    }));
  }

  async getTopCustomersByOrders(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<any[]> {
    return this.databaseService.customer.findMany({
      where: isAdmin ? {} : { order: { some: { userId } } },
      orderBy: { order: { _count: 'desc' } },
      take: limit,
      select: {
        id: true,
        fullName: true,
        _count: { select: { order: true } },
      },
    });
  }

  async getDashboardStats(userId: string, isAdmin: boolean): Promise<any> {
    const [userStats, orderStats, customerStats] = await Promise.all([
      this.getUserCustomerStats(userId),
      this.getUserOrderStats(userId),
      this.getCustomerSpending(userId, isAdmin),
    ]);

    return {
      userStats,
      orderStats,
      customerStats,
      totalCustomers: customerStats.length,
      totalSpending: customerStats.reduce(
        (sum, customer) => sum + customer.totalSpending,
        0,
      ),
    };
  }
}