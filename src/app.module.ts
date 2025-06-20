import { forwardRef, MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { CustomerModule } from './customer/customer.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { WinstonModule } from 'nest-winston';
import logger from './logger/logger';
import { NestModule } from '@nestjs/common';
import { LoggerMiddleware } from './logger/LoggerMiddleware';

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
