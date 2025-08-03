import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/database/repository/base.repository';
import { DatabaseService } from 'src/database/service/database.service';

@Injectable()
export class UserRepository extends BaseRepository<'User'> {
  constructor(
    protected readonly databaseService: DatabaseService
  ) {
    super( 'user', databaseService );
  }
}
