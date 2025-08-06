import { Module } from '@nestjs/common';
import { OrderController } from './controller/order.controller';
import { OrderService } from './service/order.service';
import { OrderRepository } from './repository/order.repository';
import { DatabaseModule } from 'src/database/database.module';
import { GuardsModule } from 'src/common/guards/guards.module';

@Module({
  imports: [DatabaseModule, GuardsModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService, OrderRepository]
})
export class OrderModule {}
