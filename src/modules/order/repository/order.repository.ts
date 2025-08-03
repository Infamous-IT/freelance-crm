import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/database/repository/base.repository';
import { DatabaseService } from 'src/database/service/database.service';

@Injectable()
export class OrderRepository extends BaseRepository<'Order'> {
  constructor(
    protected readonly databaseService: DatabaseService
  ) {
    super( 'order', databaseService );
  }
}
