import { Injectable, Inject } from '@nestjs/common';
import { StatisticsRepository } from '../repository/statistics.repository';
import { RedisClientType } from 'redis';
import logger from 'src/common/logger/logger';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async getUserCustomerStats(userId: string): Promise<number> {
    const cacheKey = `stats:user:${userId}:customers`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for user customer stats: ${userId}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching customer stats for user: ${userId}`);
    const stats = await this.statisticsRepository.getUserCustomerStats(userId);
    
    await this.redis.set(cacheKey, JSON.stringify(stats), { EX: 1800 }); // 30 min
    return stats;
  }

  async getUserOrderStats(userId: string): Promise<{
    totalOrders: number;
    totalEarnings: number;
  }> {
    const cacheKey = `stats:user:${userId}:orders`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for user order stats: ${userId}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching order stats for user: ${userId}`);
    const stats = await this.statisticsRepository.getUserOrderStats(userId);
    
    await this.redis.set(cacheKey, JSON.stringify(stats), { EX: 1800 });
    return stats;
  }

  async getTopExpensiveOrders(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<any[]> {
    const cacheKey = `stats:orders:top-expensive:${userId}:${limit}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for top expensive orders: ${userId}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching top expensive orders for user: ${userId}`);
    const orders = await this.statisticsRepository.getTopExpensiveOrders(
      userId,
      isAdmin,
      limit,
    );
    
    await this.redis.set(cacheKey, JSON.stringify(orders), { EX: 1800 });
    return orders;
  }

  async getCustomerSpending(
    userId: string,
    isAdmin: boolean,
  ): Promise<any[]> {
    const cacheKey = `stats:customers:spending:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for customer spending: ${userId}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching customer spending for user: ${userId}`);
    const spending = await this.statisticsRepository.getCustomerSpending(
      userId,
      isAdmin,
    );
    
    await this.redis.set(cacheKey, JSON.stringify(spending), { EX: 1800 });
    return spending;
  }

  async getTopCustomersBySpending(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<any[]> {
    const cacheKey = `stats:customers:top-spending:${userId}:${limit}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for top customers by spending: ${userId}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching top customers by spending for user: ${userId}`);
    const customers = await this.statisticsRepository.getTopCustomersBySpending(
      userId,
      isAdmin,
      limit,
    );
    
    await this.redis.set(cacheKey, JSON.stringify(customers), { EX: 1800 });
    return customers;
  }

  async getTopCustomersByOrders(
    userId: string,
    isAdmin: boolean,
    limit: number = 5,
  ): Promise<any[]> {
    const cacheKey = `stats:customers:top-orders:${userId}:${limit}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for top customers by orders: ${userId}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching top customers by orders for user: ${userId}`);
    const customers = await this.statisticsRepository.getTopCustomersByOrders(
      userId,
      isAdmin,
      limit,
    );
    
    await this.redis.set(cacheKey, JSON.stringify(customers), { EX: 1800 });
    return customers;
  }

  async getDashboardStats(userId: string, isAdmin: boolean): Promise<any> {
    const cacheKey = `stats:dashboard:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for dashboard stats: ${userId}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching dashboard stats for user: ${userId}`);
    const stats = await this.statisticsRepository.getDashboardStats(userId, isAdmin);
    
    await this.redis.set(cacheKey, JSON.stringify(stats), { EX: 1800 });
    return stats;
  }

  async clearUserStatsCache(userId: string): Promise<void> {
    const keys = await this.redis.keys(`stats:user:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(keys);
      logger.info(`Cleared user stats cache for: ${userId}`);
    }
  }

  async clearAllStatsCache(): Promise<void> {
    const keys = await this.redis.keys('stats:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
      logger.info('Cleared all statistics cache');
    }
  }
}
