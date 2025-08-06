import { Module } from '@nestjs/common';
import { CustomerService } from './service/customer.service';
import { CustomerController } from './controller/customer.controller';
import { CustomerRepository } from './repository/customer.repository';
import { DatabaseModule } from 'src/database/database.module';
import { GuardsModule } from 'src/common/guards/guards.module';

@Module({
  imports: [DatabaseModule, GuardsModule],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerRepository],
  exports: [CustomerService, CustomerRepository]
})
export class CustomerModule {}
