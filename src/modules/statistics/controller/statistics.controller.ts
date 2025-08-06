import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import logger from 'src/common/logger/logger';
import { StatisticsService } from '../services/statistics.service';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { TransformInterceptor } from 'src/app/interceptors/transform.interceptor';
import { CurrentUser } from 'src/app/decorators/current-user.decorator';
import { UserSecure } from 'src/modules/user/entities/user.entity';
import { CustomerSpendingResponse, DashboardStatsResponse, TopCustomerByOrdersResponse, TopCustomerBySpendingResponse, TopExpensiveOrderResponse, UserCustomerStatsResponse, UserOrderStatsResponse } from '../responses/statistics.response';

@ApiTags('Statistics')
@Controller('statistics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StatisticsController extends AbstractController {
  constructor(private readonly statisticsService: StatisticsService) {
    super();
  }

  @Get('users/:userId/customers')
  @ApiOperation({ summary: 'Отримати статистику клієнтів користувача' })
  @ApiResponse({ status: 200, description: 'Статистика клієнтів', type: UserCustomerStatsResponse })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.FREELANCER)
  async getUserCustomerStats(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.statisticsService.getUserCustomerStats(userId, currentUser);
    return this.transformToObject({ totalCustomers: response }, UserCustomerStatsResponse);
  }

  @Get('users/:userId/orders')
  @ApiOperation({ summary: 'Отримати статистику замовлень користувача' })
  @ApiResponse({ status: 200, description: 'Статистика замовлень', type: UserOrderStatsResponse })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.FREELANCER)
  async getUserOrderStats(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.statisticsService.getUserOrderStats(userId, currentUser);
    return this.transformToObject(response, UserOrderStatsResponse);
  }

  @Get('orders/top-expensive')
  @ApiOperation({ summary: 'Отримати найдорожчі замовлення' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Кількість замовлень',
    example: 5,
  })
  @ApiResponse({ status: 200, description: 'Найдорожчі замовлення', type: [TopExpensiveOrderResponse] })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getTopExpensiveOrders(
    @CurrentUser() currentUser: UserSecure,
    @Query('limit') limit: number,
  ) {
    const ordersLimit = Number(limit) || 5;
    const response = await this.statisticsService.getTopExpensiveOrders(currentUser, ordersLimit);
    return this.transformToArray(response, TopExpensiveOrderResponse);
  }

  @Get('customers/spending')
  @ApiOperation({ summary: 'Отримати витрати клієнтів' })
  @ApiResponse({ status: 200, description: 'Витрати клієнтів', type: [CustomerSpendingResponse] })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getCustomerSpending(@CurrentUser() currentUser: UserSecure) {
    const response = await this.statisticsService.getCustomerSpending(currentUser);
    return this.transformToArray(response, CustomerSpendingResponse);
  }

  @Get('customers/top-spenders')
  @ApiOperation({ summary: 'Отримати топ клієнтів за витратами' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Кількість клієнтів',
    example: 5,
  })
  @ApiResponse({ status: 200, description: 'Топ клієнтів за витратами', type: [TopCustomerBySpendingResponse] })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getTopCustomersBySpending(
    @CurrentUser() currentUser: UserSecure,
    @Query('limit') limit: number,
  ) {
    const customersLimit = Number(limit) || 5;
    const response = await this.statisticsService.getTopCustomersBySpending(currentUser, customersLimit);
    return this.transformToArray(response, TopCustomerBySpendingResponse);
  }

  @Get('customers/top-by-orders')
  @ApiOperation({ summary: 'Отримати топ клієнтів за кількістю замовлень' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Кількість клієнтів',
    example: 5,
  })
  @ApiResponse({ status: 200, description: 'Топ клієнтів за замовленнями', type: [TopCustomerByOrdersResponse] })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getTopCustomersByOrders(
    @CurrentUser() currentUser: UserSecure,
    @Query('limit') limit: number,
  ) {
    const customersLimit = Number(limit) || 5;
    const response = await this.statisticsService.getTopCustomersByOrders(currentUser, customersLimit);
    return this.transformToArray(response, TopCustomerByOrdersResponse);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Отримати статистику дашборду' })
  @ApiResponse({ status: 200, description: 'Статистика дашборду', type: DashboardStatsResponse })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getDashboardStats(@CurrentUser() currentUser: UserSecure) {
    const response = await this.statisticsService.getDashboardStats(currentUser);
    return this.transformToObject(response, DashboardStatsResponse);
  }
}
