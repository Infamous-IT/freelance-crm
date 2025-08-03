import { Prisma } from '@prisma/client';
import { DatabaseService } from '../service/database.service';
import { IBaseRepository, ModelArgs, ModelName, ModelResult } from '../interfaces/database.interface';
import { paginate, PaginatedResult } from 'src/common/pagination/paginator';

export class BaseRepository<T extends ModelName> implements IBaseRepository<T> {
  constructor(
    private readonly model: Uncapitalize<T>,
    private readonly prismaService: DatabaseService
  ) {
  }

  findUnique<A extends ModelArgs<T, 'findUnique'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'findUnique'>>
  ): ModelResult<T, A, 'findUnique'> {
    return this.prismaService[this.model as Prisma.ModelName].findUnique(
      args
    );
  }

  findUniqueOrThrow<A extends ModelArgs<T, 'findUniqueOrThrow'>>(
    args?: Prisma.SelectSubset<A, ModelArgs<T, 'findUniqueOrThrow'>>
  ): ModelResult<T, A, 'findUniqueOrThrow'> {
    return this.prismaService[
      this.model as Prisma.ModelName
    ].findUniqueOrThrow( args );
  }

  findFirst<A extends ModelArgs<T, 'findFirst'>>(
    args?: Prisma.SelectSubset<A, ModelArgs<T, 'findFirst'>>
  ): ModelResult<T, A, 'findFirst'> {
    return this.prismaService[this.model as Prisma.ModelName].findFirst( args );
  }

  findFirstOrThrow<A extends ModelArgs<T, 'findFirstOrThrow'>>(
    args?: Prisma.SelectSubset<A, ModelArgs<T, 'findFirstOrThrow'>>
  ): ModelResult<T, A, 'findFirstOrThrow'> {
    return this.prismaService[
      this.model as Prisma.ModelName
    ].findFirstOrThrow( args );
  }

  findMany<A extends ModelArgs<T, 'findMany'>>(
    args?: Prisma.SelectSubset<A, ModelArgs<T, 'findMany'>>
  ): ModelResult<T, A, 'findMany'> {
    return this.prismaService[this.model as Prisma.ModelName].findMany( args );
  }

  create<A extends ModelArgs<T, 'create'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'create'>>
  ): ModelResult<T, A, 'create'> {
    return this.prismaService[this.model as Prisma.ModelName].create( args );
  }

  createMany<A extends ModelArgs<T, 'createMany'>>(
    args?: Prisma.SelectSubset<A, ModelArgs<T, 'createMany'>>
  ): ModelResult<T, A, 'createMany'> {
    return this.prismaService[this.model as Prisma.ModelName].createMany(
      args
    );
  }

  update<A extends ModelArgs<T, 'update'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'update'>>
  ): ModelResult<T, A, 'update'> {
    return this.prismaService[this.model as Prisma.ModelName].update( args );
  }

  updateMany<A extends ModelArgs<T, 'updateMany'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'updateMany'>>
  ): ModelResult<T, A, 'updateMany'> {
    return this.prismaService[this.model as Prisma.ModelName].updateMany(
      args
    );
  }

  delete<A extends ModelArgs<T, 'delete'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'delete'>>
  ): ModelResult<T, A, 'delete'> {
    return this.prismaService[this.model as Prisma.ModelName].delete( args );
  }

  deleteMany<A extends ModelArgs<T, 'deleteMany'>>(
    args?: Prisma.SelectSubset<A, ModelArgs<T, 'deleteMany'>>
  ): ModelResult<T, A, 'deleteMany'> {
    return this.prismaService[this.model as Prisma.ModelName].deleteMany(
      args
    );
  }

  upsert<A extends ModelArgs<T, 'upsert'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'upsert'>>
  ): ModelResult<T, A, 'upsert'> {
    return this.prismaService[this.model as Prisma.ModelName].upsert( args );
  }

  count<A extends ModelArgs<T, 'count'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'count'>>
  ): ModelResult<T, A, 'count'> {
    return this.prismaService[this.model as Prisma.ModelName].count( args );
  }

  aggregate<A extends ModelArgs<T, 'aggregate'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'aggregate'>>
  ): ModelResult<T, A, 'aggregate'> {
    return this.prismaService[this.model as Prisma.ModelName].aggregate( args );
  }

  groupBy<A extends ModelArgs<T, 'groupBy'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'groupBy'>>
  ): ModelResult<T, A, 'groupBy'> {
    return this.prismaService[this.model as Prisma.ModelName].groupBy( args );
  }

  async findManyPaginated<A extends ModelArgs<T, 'findMany'>>(
    args: Prisma.SelectSubset<A, ModelArgs<T, 'findMany'>>, pagination: {
      page?: number;
      perPage?: number;
    }
  ): Promise<PaginatedResult<ModelResult<T, A, 'findMany'>>> {
    return paginate(
      this.prismaService[this.model as Prisma.ModelName],
      args,
      {
        ...pagination
      }
    );
  }
}
