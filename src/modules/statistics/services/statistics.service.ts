import { Injectable, Inject, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { StatisticsRepository } from '../repository/statistics.repository';
import { RedisClientType } from 'redis';
import logger from 'src/common/logger/logger';
import { UserSecure } from 'src/modules/user/entities/user.entity';
import { Role } from '@prisma/client';
import { CustomerSpendingResponse, DashboardStatsResponse, TopCustomerByOrdersResponse, TopCustomerBySpendingResponse, TopExpensiveOrderResponse, UserOrderStatsResponse } from '../responses/statistics.response';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async getUserCustomerStats(userId: string, currentUser: UserSecure): Promise<number> {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== userId) {
      throw new ForbiddenException('Ви можете бачити тільки свою статистику');
    }

    const cacheKey = `stats:user:${userId}:customers`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for user customer stats: ${userId}`);
      return JSON.parse(cachedData);
    }
    try {
      logger.info(`Fetching customer stats for user: ${userId}`);
      const stats = await this.statisticsRepository.getUserCustomerStats(userId);
      
      await this.redis.set(cacheKey, JSON.stringify(stats), { EX: 1800 });
      return stats;
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to get user customer stats' );
    }
  }

  async getUserOrderStats(userId: string, currentUser: UserSecure): Promise<UserOrderStatsResponse> {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== userId) {
      throw new ForbiddenException('Ви можете бачити тільки свою статистику');
    }

    const cacheKey = `stats:user:${userId}:orders`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for user order stats: ${userId}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching order stats for user: ${userId}`);

    try {
      const stats = await this.statisticsRepository.getUserOrderStats(userId);
    
      await this.redis.set(cacheKey, JSON.stringify(stats), { EX: 1800 });
      return stats;
    } catch ( err: unknown) {
      throw new UnprocessableEntityException( 'Failed to get user order stats!' );
    }
    
  }

  async getTopExpensiveOrders(
    currentUser: UserSecure,
    limit: number = 5,
  ): Promise<TopExpensiveOrderResponse[]> {
    const cacheKey = `stats:orders:top-expensive:${currentUser.id}:${limit}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for top expensive orders: ${currentUser.id}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching top expensive orders for user: ${currentUser.id}`);
    
    try {
      const orders = await this.statisticsRepository.getTopExpensiveOrders(
        currentUser.id,
        currentUser.role === Role.ADMIN,
        limit,
      );
      
      await this.redis.set(cacheKey, JSON.stringify(orders), { EX: 1800 });
      return orders;
    } catch( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to get top expensive orders' );
    }
  }

  async getCustomerSpending(currentUser: UserSecure): Promise<CustomerSpendingResponse[]> {
    const cacheKey = `stats:customers:spending:${currentUser.id}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for customer spending: ${currentUser.id}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching customer spending for user: ${currentUser.id}`);

    try {
      const spending = await this.statisticsRepository.getCustomerSpending(
        currentUser.id,
        currentUser.role === Role.ADMIN,
      );
      
      await this.redis.set(cacheKey, JSON.stringify(spending), { EX: 1800 });
      return spending;
    } catch( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to get customer spending' );
    }
  }

  async getTopCustomersBySpending(
    currentUser: UserSecure,
    limit: number = 5,
  ): Promise<TopCustomerBySpendingResponse[]> {
    const cacheKey = `stats:customers:top-spending:${currentUser.id}:${limit}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for top customers by spending: ${currentUser.id}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching top customers by spending for user: ${currentUser.id}`);
    try {
      const customers = await this.statisticsRepository.getTopCustomersBySpending(
        currentUser.id,
        currentUser.role === Role.ADMIN,
        limit,
      );
      
      await this.redis.set(cacheKey, JSON.stringify(customers), { EX: 1800 });
      return customers;
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed get top customers by spending' );
    }
  }

  async getTopCustomersByOrders(
    currentUser: UserSecure,
    limit: number = 5,
  ): Promise<TopCustomerByOrdersResponse[]> {
    const cacheKey = `stats:customers:top-orders:${currentUser.id}:${limit}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for top customers by orders: ${currentUser.id}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching top customers by orders for user: ${currentUser.id}`);
    try {
      const customers = await this.statisticsRepository.getTopCustomersByOrders(
        currentUser.id,
        currentUser.role === Role.ADMIN,
        limit,
      );
      
      await this.redis.set(cacheKey, JSON.stringify(customers), { EX: 1800 });
      return customers;
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to get top customers by orders' );
    }
  }

  async getDashboardStats(currentUser: UserSecure): Promise<DashboardStatsResponse> {
    const cacheKey = `stats:dashboard:${currentUser.id}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache hit for dashboard stats: ${currentUser.id}`);
      return JSON.parse(cachedData);
    }

    logger.info(`Fetching dashboard stats for user: ${currentUser.id}`);
    try {
      const stats = await this.statisticsRepository.getDashboardStats(
        currentUser.id, 
        currentUser.role === Role.ADMIN
      );
      
      await this.redis.set(cacheKey, JSON.stringify(stats), { EX: 1800 });
      return stats;
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to get dashboard stats' );
    }
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
