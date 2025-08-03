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
  UseInterceptors
} from '@nestjs/common';
import { CustomerService } from '../service/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import logger from 'src/common/logger/logger';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { PaginatedResult } from 'src/modules/customer/interfaces/customer.interface';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { GetCustomersDto } from '../dto/get-customers.dto';
import { PaginatedTransformInterceptor } from 'src/app/interceptors/paginated-transform.interceptor';
import { Customer } from '../entities/customer.entity';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController extends AbstractController {
  constructor(private readonly customerService: CustomerService) {
    super();
  }

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

  @Get()
  @UseInterceptors( new PaginatedTransformInterceptor( Customer ) )
  @ApiOperation({ summary: 'Отримати список всіх замовників' })
  @ApiResponse({ status: 200, description: 'Список замовників успішно отримано' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getAllPaginated(
    @Query() getCustomersDto: GetCustomersDto,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 20,
  ): Promise<PaginatedResult<Customer>> {
    logger.info(`Fetching customers with filters: ${JSON.stringify(getCustomersDto)}`);
    return this.customerService.findAll(getCustomersDto, page, perPage);
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
}
