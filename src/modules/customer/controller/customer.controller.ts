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
import { Role } from '@prisma/client';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { GetCustomersDto } from '../dto/get-customers.dto';
import { PaginatedTransformInterceptor } from 'src/app/interceptors/paginated-transform.interceptor';
import { AuthRolesGuard } from 'src/common/guards/user-auth.guard';
import { TransformInterceptor } from 'src/app/interceptors/transform.interceptor';
import { UserSecure } from 'src/modules/user/entities/user.entity';
import { CurrentUser } from 'src/app/decorators/current-user.decorator';
import { CustomerResponse } from '../responses/customer.response';
import { CustomerIdParamDto } from 'src/common/dtos/customer-id-param.dto';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController extends AbstractController {
  constructor(private readonly customerService: CustomerService) {
    super();
  }

  @Post()
  @ApiOperation({ summary: 'Створити нового замовника' })
  @ApiResponse({ status: 201, description: 'Замовник успішно створений', type: CustomerResponse })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.customerService.create(createCustomerDto, currentUser);
    return this.transformToObject(response, CustomerResponse);
  }

  @Post(':customerId/orders')
  @ApiOperation({ summary: 'Додати замовлення до існуючого замовника' })
  @ApiResponse({
    status: 200,
    description: 'Замовлення успішно додані до замовника',
    type: CustomerResponse
  })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async addOrdersToCustomer(
    @Param() param: CustomerIdParamDto,
    @Body() body: { orderIds: string[] },
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.customerService.addOrdersToCustomer(param.customerId, body.orderIds, currentUser);
    return this.transformToObject(response, CustomerResponse);
  }

  @Get()
  @UseInterceptors(new PaginatedTransformInterceptor(CustomerResponse))
  @ApiOperation({ summary: 'Отримати список всіх замовників' })
  @ApiResponse({ status: 200, description: 'Список замовників успішно отримано' })
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getAllPaginated(
    @Query() getCustomersDto: GetCustomersDto,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 20,
    @CurrentUser() currentUser: UserSecure
  ) {
    return await this.customerService.findAll(getCustomersDto, page, perPage, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати замовника за ID' })
  @ApiResponse({ status: 200, description: 'Замовник знайдений', type: CustomerResponse })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async findOne(
    @Param() param: CustomerIdParamDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.customerService.findOne(param.customerId, currentUser);
    return this.transformToObject(response, CustomerResponse);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити інформацію про замовника' })
  @ApiResponse({
    status: 200,
    description: 'Інформація про замовника успішно оновлена',
    type: CustomerResponse
  })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async update(
    @Param() param: CustomerIdParamDto,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.customerService.update(param.customerId, updateCustomerDto, currentUser);
    return this.transformToObject(response, CustomerResponse);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити замовника' })
  @ApiResponse({ status: 200, description: 'Замовник успішно видалений', type: CustomerResponse })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async remove(
    @Param() param: CustomerIdParamDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.customerService.remove(param.customerId, currentUser);
    return this.transformToObject(response, CustomerResponse);
  }
}
