import { Prisma, PrismaClient } from '@prisma/client';
import { GetResult as PrismaGetResult, Operation } from '@prisma/client/runtime/library';

interface Clients<
  T extends ModelName,
  A extends ModelArgs<T, O>,
  O extends Operation,
> {
  User: Prisma.Prisma__UserClient<GetResult<T, A, O>, never>;
  Customer: Prisma.Prisma__CustomerClient<GetResult<T, A, O>, never>;
  Order: Prisma.Prisma__OrderClient<GetResult<T, A, O>, never>;
}

type MethodsWithParams<T, M extends ModelName> = {
  [K in keyof T & Operation]: T[K] extends true
    ? <A extends ModelArgs<M, K>>(
      args?: Prisma.SelectSubset<A, ModelArgs<M, K>>,
    ) => ModelResult<M, A, K>
    : <A extends ModelArgs<M, K>>(
      args: Prisma.SelectSubset<A, ModelArgs<M, K>>,
    ) => ModelResult<M, A, K>;
};

export type IBaseRepository<T extends ModelName> = MethodsWithParams<
  Operation,
  T
>;

/* Prisma models */
export type ModelName = Prisma.ModelName;

/* Prisma model methods */
export type PrismaModelMethods<T extends ModelName> =
  keyof PrismaClient[Uncapitalize<T> extends keyof PrismaClient
    ? Uncapitalize<T>
    : never];

type PrismaModelMethod<T extends ModelName> = {
  [K in PrismaModelMethods<T>]: PrismaClient[Uncapitalize<T> extends keyof PrismaClient
    ? Uncapitalize<T>
    : never][K];
};

/* Prisma GetResult */
type GetResult<
  T extends ModelName,
  A extends ModelArgs<T, O>,
  O extends Operation,
> = PrismaGetResult<PrismaPayload<T>, A, O>;

/* Prisma payload */
export type PrismaPayload<T extends ModelName> =
  Prisma.TypeMap['model'][T]['payload'];

/* Prisma model arguments */
export type ModelArgs<
  T extends ModelName,
  O extends Operation,
> = PrismaModelMethod<T>[O extends keyof PrismaModelMethod<T>
  ? O
  : never] extends ( args: infer A ) => any
  ? A
  : never;

/* Prisma model return types */
export type ModelResult<
  T extends ModelName,
  A extends ModelArgs<T, O>,
  O extends Operation,
> = PrismaModelMethod<T> extends {
    [K in O]: ( args: A ) => any;
  }
  ? Clients<T, A, O>[T extends keyof Clients<T, A, O> ? T : never]
  : never;
