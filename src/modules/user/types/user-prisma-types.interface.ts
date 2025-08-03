import { Prisma } from '@prisma/client';

export const userWithOrderIncludes = Prisma.validator<Prisma.UserDefaultArgs>()(
  {
    include: {
      orders: true,
    },
  },
);

export type UserWithOrderIncludesType = Prisma.UserGetPayload<
  typeof userWithOrderIncludes
>;
