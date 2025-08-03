import {
    Controller,
    Get,
    Param,
    Query,
    Req,
    UseGuards,
    } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import logger from 'src/common/logger/logger';
import { StatisticsService } from '../services/statistics.service';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';

    @ApiTags('Statistics')
    @Controller('statistics')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    export class StatisticsController extends AbstractController {
    constructor(private readonly statisticsService: StatisticsService) {
        super();
    }

    @Get('users/:userId/customers')
    @ApiOperation({ summary: 'Отримати статистику клієнтів користувача' })
    @ApiResponse({ status: 200, description: 'Статистика клієнтів' })
    @Roles(Role.ADMIN, Role.FREELANCER)
    async getUserCustomerStats(@Param('userId') userId: string): Promise<number> {
        logger.info(`Request for user customer stats: ${userId}`);
        return this.statisticsService.getUserCustomerStats(userId);
    }

    @Get('users/:userId/orders')
    @ApiOperation({ summary: 'Отримати статистику замовлень користувача' })
    @ApiResponse({ status: 200, description: 'Статистика замовлень' })
    @Roles(Role.ADMIN, Role.FREELANCER)
    async getUserOrderStats(@Param('userId') userId: string): Promise<{
        totalOrders: number;
        totalEarnings: number;
    }> {
        logger.info(`Request for user order stats: ${userId}`);
        return this.statisticsService.getUserOrderStats(userId);
    }

    @Get('orders/top-expensive')
    @ApiOperation({ summary: 'Отримати найдорожчі замовлення' })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Кількість замовлень',
        example: 5,
    })
    @ApiResponse({ status: 200, description: 'Найдорожчі замовлення' })
    @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
    async getTopExpensiveOrders(
        @Req() req: any,
        @Query('limit') limit: number,
    ): Promise<any[]> {
        const isAdmin = req.user.role === 'ADMIN';
        const ordersLimit = Number(limit) || 5;
        logger.info(`Request for top expensive orders: ${req.user.id}`);
        return this.statisticsService.getTopExpensiveOrders(
        req.user.id,
        isAdmin,
        ordersLimit,
        );
    }

    @Get('customers/spending')
    @ApiOperation({ summary: 'Отримати витрати клієнтів' })
    @ApiResponse({ status: 200, description: 'Витрати клієнтів' })
    @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
    async getCustomerSpending(@Req() req: any): Promise<any[]> {
        const isAdmin = req.user.role === 'ADMIN';
        logger.info(`Request for customer spending: ${req.user.id}`);
        return this.statisticsService.getCustomerSpending(req.user.id, isAdmin);
    }

    @Get('customers/top-spenders')
    @ApiOperation({ summary: 'Отримати топ клієнтів за витратами' })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Кількість клієнтів',
        example: 5,
    })
    @ApiResponse({ status: 200, description: 'Топ клієнтів за витратами' })
    @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
    async getTopCustomersBySpending(
        @Req() req: any,
        @Query('limit') limit: number,
    ): Promise<any[]> {
        const isAdmin = req.user.role === 'ADMIN';
        const customersLimit = Number(limit) || 5;
        logger.info(`Request for top customers by spending: ${req.user.id}`);
        return this.statisticsService.getTopCustomersBySpending(
        req.user.id,
        isAdmin,
        customersLimit,
        );
    }

    @Get('customers/top-by-orders')
    @ApiOperation({ summary: 'Отримати топ клієнтів за кількістю замовлень' })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Кількість клієнтів',
        example: 5,
    })
    @ApiResponse({ status: 200, description: 'Топ клієнтів за замовленнями' })
    @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
    async getTopCustomersByOrders(
        @Req() req: any,
        @Query('limit') limit: number,
    ): Promise<any[]> {
        const isAdmin = req.user.role === 'ADMIN';
        const customersLimit = Number(limit) || 5;
        logger.info(`Request for top customers by orders: ${req.user.id}`);
        return this.statisticsService.getTopCustomersByOrders(
        req.user.id,
        isAdmin,
        customersLimit,
        );
    }

    @Get('dashboard')
    @ApiOperation({ summary: 'Отримати статистику дашборду' })
    @ApiResponse({ status: 200, description: 'Статистика дашборду' })
    @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
    async getDashboardStats(@Req() req: any): Promise<any> {
        const isAdmin = req.user.role === 'ADMIN';
        logger.info(`Request for dashboard stats: ${req.user.id}`);
        return this.statisticsService.getDashboardStats(req.user.id, isAdmin);
    }
}
