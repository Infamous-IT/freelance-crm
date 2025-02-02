import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CustomerService } from '../service/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Створити нового замовника' })
  @ApiResponse({ status: 201, description: 'Замовник успішно створений' })
  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customerService.create(createCustomerDto);
  }

  @Post(':customerId/orders')
  @ApiOperation({ summary: 'Додати замовлення до існуючого замовника' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно додані до замовника' })
  @ApiResponse({ status: 400, description: 'Помилка, якщо замовник не знайдений' })
  @UseGuards(AuthGuard('jwt'))
  addOrdersToCustomer(
    @Param('customerId') customerId: string, 
    @Body() body: { orderIds: string[] }
  ) {
    return this.customerService.addOrdersToCustomer(customerId, body.orderIds);
  }

  @ApiOperation({ summary: 'Отримати список всіх замовників' })
  @ApiResponse({ status: 200, description: 'Список замовників успішно отримано' })
  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll() {
    return this.customerService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Отримати замовника за ID' })
  @ApiResponse({ status: 200, description: 'Замовник знайдений' })
  @ApiResponse({ status: 404, description: 'Замовник не знайдений' })
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Оновити інформацію про замовника' })
  @ApiResponse({ status: 200, description: 'Інформація про замовника успішно оновлена' })
  @ApiResponse({ status: 404, description: 'Замовник не знайдений' })
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Видалити замовника' })
  @ApiResponse({ status: 200, description: 'Замовник успішно видалений' })
  @ApiResponse({ status: 404, description: 'Замовник не знайдений' })
  remove(@Param('id') id: string) {
    return this.customerService.remove(id);
  }
}
