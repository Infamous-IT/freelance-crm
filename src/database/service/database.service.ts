import {
    Injectable, Logger, OnModuleInit 
  } from '@nestjs/common';
  import { PrismaClient } from '@prisma/client';
  
  @Injectable()
  export class DatabaseService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger( DatabaseService.name );
  
    async onModuleInit(): Promise<void> {
      try {
        await this.$connect();
        this.logger.log( 'Database connection verified successfully.' );
      } catch ( error ) {
        this.logger.error( 'Database connection failed:', error );
        throw new Error( 'Database connection failed' );
      }
    }
  }
  