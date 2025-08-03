import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { CustomerService } from '../service/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import logger from 'src/common/logger/logger';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Customer } from '@prisma/client';
import {
  CustomerSpending,
  CustomerStats,
  PaginatedResult,
  TopCustomerByOrders,
} from 'src/modules/customer/interfaces/customer.interface';
import { GetTopCustomersBySpending } from '../types/customer-prisma-types.interface';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  @ApiOperation({ summary: 'Створити нового замовника' })
  @ApiResponse({ status: 201, description: 'Замовник успішно створений' })
  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto): Promise<Customer> {
    logger.info('Received request to create a new customer');
    return this.customerService.create(createCustomerDto);
  }

  @Post(':customerId/orders')
  @ApiOperation({ summary: 'Додати замовлення до існуючого замовника' })
  @ApiResponse({
    status: 200,
    description: 'Замовлення успішно додані до замовника',
  })
  @ApiResponse({
    status: 400,
    description: 'Помилка, якщо замовник не знайдений',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  addOrdersToCustomer(
    @Param('customerId') customerId: string,
    @Body() body: { orderIds: string[] },
  ): Promise<Customer> {
    logger.info(`Adding orders to customer with ID: ${customerId}`);
    return this.customerService.addOrdersToCustomer(customerId, body.orderIds);
  }

  @ApiOperation({ summary: 'Отримати список всіх замовників' })
  @ApiResponse({
    status: 200,
    description: 'Список замовників успішно отримано',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  @Get()
  findAll(): Promise<PaginatedResult<Customer>> {
    logger.info('Received request to find all customers');
    return this.customerService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  @ApiOperation({ summary: 'Отримати замовника за ID' })
  @ApiResponse({ status: 200, description: 'Замовник знайдений' })
  @ApiResponse({ status: 404, description: 'Замовник не знайдений' })
  findOne(@Param('id') id: string): Promise<Customer | null> {
    logger.info(`Received request to find customer by ID ${id}`);
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  @ApiOperation({ summary: 'Оновити інформацію про замовника' })
  @ApiResponse({
    status: 200,
    description: 'Інформація про замовника успішно оновлена',
  })
  @ApiResponse({ status: 404, description: 'Замовник не знайдений' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    logger.info(`Received request to update customer with id ${id}`);
    return this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  @ApiOperation({ summary: 'Видалити замовника' })
  @ApiResponse({ status: 200, description: 'Замовник успішно видалений' })
  @ApiResponse({ status: 404, description: 'Замовник не знайдений' })
  remove(@Param('id') id: string): Promise<string> {
    logger.info(`Received request to delete customer with ID: ${id}`);
    return this.customerService.remove(id);
  }

  @Get('stats/customer-spending')
  @ApiOperation({ summary: 'Отримати витрати клієнтів' })
  @ApiResponse({
    status: 200,
    description: 'Успішно отримано витрати клієнтів',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  getCustomerSpending(@Req() req: any): Promise<CustomerSpending[]> {
    logger.info('Received request to get customer spending');
    return this.customerService.getCustomerSpending(
      req.user.id,
      req.user.role === 'ADMIN',
    );
  }

  @Get('stats/top-spenders')
  @ApiOperation({ summary: 'Отримати топ клієнтів за витратами' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Кількість клієнтів',
    example: 5,
  })
  @ApiResponse({ status: 200, description: 'Успішно отримано топ клієнтів' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  getTopCustomersBySpending(
    @Req() req: any,
    @Query('limit') limit: number,
  ): Promise<GetTopCustomersBySpending[]> {
    const isAdmin = req.user.role === 'ADMIN';
    const customersLimit = Number(limit) || 5;
    logger.info('Received request to get top customers by spending');
    return this.customerService.getTopCustomersBySpending(
      req.user.id,
      isAdmin,
      customersLimit,
    );
  }

  @Get('stats/top-customers/orders')
  @ApiOperation({ summary: 'Отримати топ клієнтів за кількістю замовлень' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Кількість клієнтів',
    example: 5,
  })
  @ApiResponse({ status: 200, description: 'Успішно отримано топ клієнтів' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  getTopCustomersByOrders(
    @Req() req: any,
    @Query('limit') limit: number,
  ): Promise<TopCustomerByOrders[]> {
    const userId: string = req.user.id;
    const isAdmin: boolean = req.user.role === 'ADMIN';
    logger.info('Received request to get top customers by orders');
    return this.customerService.getTopCustomersByOrders(
      userId,
      isAdmin,
      Number(limit) || 5,
    );
  }

  @Get('stats/customers')
  @ApiOperation({
    summary: 'Отримати статистику клієнтів для поточного користувача',
  })
  @ApiResponse({ status: 200, description: 'Успішно отримано статистику' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  getUserCustomerStats(@Req() req: any): Promise<CustomerStats> {
    logger.info('Received request to get user customer stats');
    return this.customerService.getUserCustomerStats(
      req.user.id,
      req.user.role === 'admin',
    );
  }
}
