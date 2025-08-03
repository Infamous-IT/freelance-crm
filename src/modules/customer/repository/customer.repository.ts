import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/database/repository/base.repository';
import { DatabaseService } from 'src/database/service/database.service';

@Injectable()
export class CustomerRepository extends BaseRepository<'Customer'> {
  constructor(
    protected readonly databaseService: DatabaseService
  ) {
    super( 'customer', databaseService );
  }
}
