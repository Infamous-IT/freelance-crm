import { Prisma } from '@prisma/client';

export const orderWithCustomerIncludes =
  Prisma.validator<Prisma.OrderDefaultArgs>()({
    include: {
      customers: true,
    },
  });

export type OrderWithCustomerIncludes = Prisma.OrderGetPayload<
  typeof orderWithCustomerIncludes
>;

export const orderWithRelationIncludes =
  Prisma.validator<Prisma.OrderDefaultArgs>()({
    include: {
      customers: true,
      user: true,
    },
  });

export type OrderWithRelationIncludes = Prisma.OrderGetPayload<
  typeof orderWithRelationIncludes
>;

export const orderWithSelectIncludes =
  Prisma.validator<Prisma.OrderDefaultArgs>()({
    select: {
      id: true,
      title: true,
      price: true,
    },
  });

export type OrderWithSelectIncludes = Prisma.OrderGetPayload<
  typeof orderWithSelectIncludes
>;

export const getTopCustomersBySpending =
  Prisma.validator<Prisma.OrderDefaultArgs>()({
    select: {
      price: true,
      customers: {
        select: {
          id: true,
        },
      },
    },
  });

export type GetTopCustomersBySpending = Prisma.OrderGetPayload<
  typeof getTopCustomersBySpending
>;
