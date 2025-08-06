import { MiddlewareConsumer, Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { OrderModule } from './modules/order/order.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { WinstonModule } from 'nest-winston';
import logger from './common/logger/logger';
import { NestModule } from '@nestjs/common';
import { LoggerMiddleware } from './common/logger/LoggerMiddleware';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { GuardsModule } from './common/guards/guards.module';

@Module({
  imports: [
    GuardsModule,
    UserModule,
    OrderModule,
    CustomerModule,
    AuthModule,
    StatisticsModule,
    RedisModule,
    WinstonModule.forRoot({
      transports: logger.transports,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
