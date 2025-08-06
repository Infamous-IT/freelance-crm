import { Module } from '@nestjs/common';
import { UserController } from './controller/user.controller';
import { UserService } from './service/user.service';
import { UserRepository } from './repository/user.repository';
import { DatabaseModule } from 'src/database/database.module';
import { GuardsModule } from 'src/common/guards/guards.module';

@Module({
  imports: [DatabaseModule, GuardsModule],
  controllers: [UserController],
  providers: [
    UserService, 
    UserRepository
  ],
  exports: [
    UserService, 
    UserRepository
  ],
})
export class UserModule {}
