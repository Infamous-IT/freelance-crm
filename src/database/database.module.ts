import { Global, Module } from '@nestjs/common';

import { DatabaseService } from './service/database.service';

@Global()
@Module({
  imports: [],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {
}

