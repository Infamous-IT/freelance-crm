import { Prisma } from '@prisma/client';

export const customerWithOrderIncludes =
  Prisma.validator<Prisma.CustomerDefaultArgs>()({
    include: {
      order: true,
    },
  });

export type CustomerWithOrderIncludes = Prisma.CustomerGetPayload<
  typeof customerWithOrderIncludes
>;

export const customerWithSelectIncludes =
  Prisma.validator<Prisma.CustomerDefaultArgs>()({
    select: {
      id: true,
      fullName: true,
      order: {
        select: {
          price: true,
        },
      },
    },
  });

export type CustomerWithSelectIncludes = Prisma.CustomerGetPayload<
  typeof customerWithSelectIncludes
>;

export const getTopCustomersGetByOrders =
  Prisma.validator<Prisma.CustomerDefaultArgs>()({
    select: {
      id: true,
      fullName: true,
      _count: {
        select: {
          order: true,
        },
      },
    },
  });

export type GetTopCustomersGetByOrders = Prisma.CustomerGetPayload<
  typeof getTopCustomersGetByOrders
>;

export const getTopCustomersBySpending =
  Prisma.validator<Prisma.CustomerDefaultArgs>()({
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

export type GetTopCustomersBySpending = Prisma.CustomerGetPayload<
  typeof getTopCustomersBySpending
>;
