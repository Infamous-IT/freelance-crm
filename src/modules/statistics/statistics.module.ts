import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { OrderModule } from '../order/order.module';
import { CustomerModule } from '../customer/customer.module';
import { StatisticsController } from './controller/statistics.controller';
import { StatisticsService } from './services/statistics.service';
import { StatisticsRepository } from './repository/statistics.repository';

@Module({
  imports: [UserModule, OrderModule, CustomerModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsRepository],
  exports: [StatisticsService],
})
export class StatisticsModule {}