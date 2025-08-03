import { forwardRef, MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { OrderModule } from './modules/order/order.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { WinstonModule } from 'nest-winston';
import logger from './common/logger/logger';
import { NestModule } from '@nestjs/common';
import { LoggerMiddleware } from './common/logger/LoggerMiddleware';

@Module({
  imports: [
    UserModule,
    OrderModule,
    CustomerModule,
    AuthModule,
    RedisModule,
    WinstonModule.forRoot({
      transports: logger.transports,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
