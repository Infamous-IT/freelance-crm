import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderRepository } from '../repository/order.repository';
import { RedisClientType } from 'redis';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderQuerySearchParamsDto } from '../dto/order-query-search-params.dto';
import { UserSecure } from '../../../modules/user/entities/user.entity';
import { Role, Category, OrderStatus, Order } from '@prisma/client';
import { PaginatedOrders } from '../interfaces/order.interface';
import { OrderWithRelationIncludes } from '../types/order-prisma-types.interface';

jest.mock('../../../common/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../common/pagination/paginator', () => ({
  paginate: jest.fn(),
}));

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let redis: jest.Mocked<RedisClientType>;

  const mockUserSecure: UserSecure = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    country: 'Ukraine',
    isEmailVerified: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    role: Role.FREELANCER,
  };

  const mockAdminUser: UserSecure = {
    ...mockUserSecure,
    id: 'admin-1',
    role: Role.ADMIN,
  };

  const mockOrder: Order = {
    id: 'order-1',
    title: 'Test Order',
    description: 'Test Description',
    price: 1000,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    category: Category.BACKEND,
    status: OrderStatus.NEW,
    userId: 'user-1',
  };

  const mockOrderWithRelations: OrderWithRelationIncludes = {
    ...mockOrder,
    user: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'hashedPassword',
      country: 'Ukraine',
      isEmailVerified: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      role: Role.FREELANCER,
    },
    customers: [],
  };

  const mockCreateOrderDto: CreateOrderDto = {
    title: 'Test Order',
    description: 'Test Description',
    price: 1000,
    startDate: '01-01-2025',
    endDate: '31-01-2025',
    category: Category.BACKEND,
    status: OrderStatus.NEW,
    customerId: 'customer-1',
  };

  const mockUpdateOrderDto: UpdateOrderDto = {
    title: 'Updated Order',
    description: 'Updated Description',
  };

  const mockOrderQuerySearchParamsDto: OrderQuerySearchParamsDto = {
    searchText: 'test',
    category: Category.BACKEND,
    status: OrderStatus.NEW,
    orderBy: { field: 'title', sorting: 'asc' },
  };

  const mockPaginatedOrders: PaginatedOrders = {
    data: [mockOrder],
    totalCount: 1,
    totalPages: 1,
    currentPage: 1,
  };

  beforeEach(async () => {
    const mockOrderRepository = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    };

    const mockRedis = {
      keys: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderRepository,
          useValue: mockOrderRepository,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(OrderRepository);
    redis = module.get('REDIS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create order successfully', async () => {
      orderRepository.create.mockResolvedValue(mockOrder);
      redis.keys.mockResolvedValue(['orders:1', 'orders:2']);
      redis.del.mockResolvedValue(2);
  
      const result = await service.create(mockCreateOrderDto, mockUserSecure);
  
      expect(orderRepository.create).toHaveBeenCalledWith({
        data: {
          title: mockCreateOrderDto.title,
          description: mockCreateOrderDto.description,
          price: mockCreateOrderDto.price,
          startDate: expect.stringMatching(/2024-12-31T22:00:00\.000Z/),
          endDate: expect.stringMatching(/2025-01-30T22:00:00\.000Z/),
          category: mockCreateOrderDto.category,
          status: mockCreateOrderDto.status,
          customerId: mockCreateOrderDto.customerId,
          userId: mockUserSecure.id,
        },
      });
      expect(redis.keys).toHaveBeenCalledWith('orders:*');
      expect(redis.del).toHaveBeenCalledWith(['orders:1', 'orders:2']);
      expect(result).toEqual(mockOrder);
    });
  
    it('should convert date strings to ISO format', async () => {
      const orderWithCustomDates = {
        ...mockCreateOrderDto,
        startDate: '15-03-2025',
        endDate: '20-03-2025',
      };
      orderRepository.create.mockResolvedValue(mockOrder);
      redis.keys.mockResolvedValue([]);
  
      await service.create(orderWithCustomDates, mockUserSecure);
  
      expect(orderRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startDate: expect.stringMatching(/2025-03-14T22:00:00\.000Z/),
          endDate: expect.stringMatching(/2025-03-19T22:00:00\.000Z/),
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated orders for admin user', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockOrder],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const result = await service.findAll(mockOrderQuerySearchParamsDto, 1, 20, mockAdminUser);

      expect(paginate).toHaveBeenCalledWith(
        orderRepository,
        {
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
            category: Category.BACKEND,
            status: OrderStatus.NEW,
          },
          orderBy: {
            title: 'asc',
          },
          include: {
            user: true,
            customers: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
      expect(result).toEqual(mockPaginatedOrders);
    });

    it('should return paginated orders for non-admin user (only their orders)', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockOrder],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const result = await service.findAll(mockOrderQuerySearchParamsDto, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        orderRepository,
        {
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
            category: Category.BACKEND,
            status: OrderStatus.NEW,
            userId: mockUserSecure.id,
          },
          orderBy: {
            title: 'asc',
          },
          include: {
            user: true,
            customers: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
      expect(result).toEqual(mockPaginatedOrders);
    });

    it('should handle empty search text', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockOrder],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const emptySearchParams = { ...mockOrderQuerySearchParamsDto, searchText: undefined };
      await service.findAll(emptySearchParams, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        orderRepository,
        {
          where: {
            category: Category.BACKEND,
            status: OrderStatus.NEW,
            userId: mockUserSecure.id,
          },
          orderBy: {
            title: 'asc',
          },
          include: {
            user: true,
            customers: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
    });

    it('should handle service error during findAll', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockRejectedValue(new Error('Database error'));

      await expect(
        service.findAll(mockOrderQuerySearchParamsDto, 1, 20, mockUserSecure)
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should handle multiple search terms', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockOrder],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const multiSearchParams = { ...mockOrderQuerySearchParamsDto, searchText: 'test order' };
      await service.findAll(multiSearchParams, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        orderRepository,
        {
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
              { title: { contains: 'order', mode: 'insensitive' } },
              { description: { contains: 'order', mode: 'insensitive' } },
            ],
            category: Category.BACKEND,
            status: OrderStatus.NEW,
            userId: mockUserSecure.id,
          },
          orderBy: {
            title: 'asc',
          },
          include: {
            user: true,
            customers: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
    });
  });

  describe('findOne', () => {
    it('should return order by ID for admin user', async () => {
      orderRepository.findUnique.mockResolvedValue(mockOrderWithRelations);

      const result = await service.findOne('order-1', mockAdminUser);

      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          customers: true,
          user: true,
        },
      });
      expect(result).toEqual(mockOrderWithRelations);
    });

    it('should return order by ID for order owner', async () => {
      orderRepository.findUnique.mockResolvedValue(mockOrderWithRelations);

      const result = await service.findOne('order-1', mockUserSecure);

      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          customers: true,
          user: true,
        },
      });
      expect(result).toEqual(mockOrderWithRelations);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockUserSecure)).rejects.toThrow(
        NotFoundException
      );
      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        include: {
          customers: true,
          user: true,
        },
      });
    });

    it('should throw ForbiddenException when user tries to access another user order', async () => {
      const anotherUserOrder = {
        ...mockOrderWithRelations,
        userId: 'another-user-id',
      };
      orderRepository.findUnique.mockResolvedValue(anotherUserOrder);

      await expect(service.findOne('order-1', mockUserSecure)).rejects.toThrow(
        ForbiddenException
      );
      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          customers: true,
          user: true,
        },
      });
    });
  });

  describe('update', () => {
    it('should update order successfully for admin user', async () => {
      orderRepository.findUnique.mockResolvedValue(mockOrder);
      orderRepository.update.mockResolvedValue(mockOrder);
      redis.keys.mockResolvedValue(['orders:1']);
      redis.del.mockResolvedValue(1);

      const result = await service.update('order-1', mockUpdateOrderDto, mockAdminUser);

      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(orderRepository.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: mockUpdateOrderDto,
      });
      expect(redis.keys).toHaveBeenCalledWith('orders:*');
      expect(result).toEqual(mockOrder);
    });

    it('should update order successfully for order owner', async () => {
      orderRepository.findUnique.mockResolvedValue(mockOrder);
      orderRepository.update.mockResolvedValue(mockOrder);
      redis.keys.mockResolvedValue(['orders:1']);
      redis.del.mockResolvedValue(1);

      const result = await service.update('order-1', mockUpdateOrderDto, mockUserSecure);

      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(orderRepository.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: mockUpdateOrderDto,
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw ForbiddenException when order not found', async () => {
      orderRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', mockUpdateOrderDto, mockUserSecure)
      ).rejects.toThrow(ForbiddenException);
      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
    });

    it('should throw ForbiddenException when user tries to update another user order', async () => {
      const anotherUserOrder = {
        ...mockOrder,
        userId: 'another-user-id',
      };
      orderRepository.findUnique.mockResolvedValue(anotherUserOrder);

      await expect(
        service.update('order-1', mockUpdateOrderDto, mockUserSecure)
      ).rejects.toThrow(ForbiddenException);
      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
    });

    it('should handle date conversion in update', async () => {
      const updateDtoWithDates: UpdateOrderDto = {
        startDate: '15-03-2025',
        endDate: '20-03-2025',
      };
      orderRepository.findUnique.mockResolvedValue(mockOrder);
      orderRepository.update.mockResolvedValue(mockOrder);
      redis.keys.mockResolvedValue([]);
    
      await service.update('order-1', updateDtoWithDates, mockUserSecure);
    
      expect(orderRepository.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          startDate: expect.stringMatching(/2025-03-14T22:00:00\.000Z/),
          endDate: expect.stringMatching(/2025-03-19T22:00:00\.000Z/),
        },
      });
    });
  });

  describe('remove', () => {
    it('should remove order successfully for admin user', async () => {
      orderRepository.findUnique.mockResolvedValue(mockOrder);
      orderRepository.delete.mockResolvedValue(mockOrder);
      redis.keys.mockResolvedValue(['orders:1']);
      redis.del.mockResolvedValue(1);

      const result = await service.remove('order-1', mockAdminUser);

      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(orderRepository.delete).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(redis.keys).toHaveBeenCalledWith('orders:*');
      expect(result).toEqual(mockOrder);
    });

    it('should remove order successfully for order owner', async () => {
      orderRepository.findUnique.mockResolvedValue(mockOrder);
      orderRepository.delete.mockResolvedValue(mockOrder);
      redis.keys.mockResolvedValue(['orders:1']);
      redis.del.mockResolvedValue(1);

      const result = await service.remove('order-1', mockUserSecure);

      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(orderRepository.delete).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw ForbiddenException when order not found', async () => {
      orderRepository.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockUserSecure)).rejects.toThrow(
        ForbiddenException
      );
      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
    });

    it('should throw ForbiddenException when user tries to delete another user order', async () => {
      const anotherUserOrder = {
        ...mockOrder,
        userId: 'another-user-id',
      };
      orderRepository.findUnique.mockResolvedValue(anotherUserOrder);

      await expect(service.remove('order-1', mockUserSecure)).rejects.toThrow(
        ForbiddenException
      );
      expect(orderRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
    });
  });

  describe('private methods', () => {
    describe('convertDateToISO', () => {
      it('should convert date string to ISO format', () => {
        const result = (service as any).convertDateToISO('15-03-2025');
        expect(result).toMatch(/2025-03-14T22:00:00\.000Z/);
      });
    
      it('should handle single digit day and month', () => {
        const result = (service as any).convertDateToISO('05-09-2025');
        expect(result).toMatch(/2025-09-04T21:00:00\.000Z/);
      });
    });

    describe('clearCache', () => {
      it('should clear cache when keys exist', async () => {
        redis.keys.mockResolvedValue(['orders:1', 'orders:2']);
        redis.del.mockResolvedValue(2);

        await (service as any).clearCache();

        expect(redis.keys).toHaveBeenCalledWith('orders:*');
        expect(redis.del).toHaveBeenCalledWith(['orders:1', 'orders:2']);
      });

      it('should handle empty cache keys', async () => {
        redis.keys.mockResolvedValue([]);

        await (service as any).clearCache();

        expect(redis.keys).toHaveBeenCalledWith('orders:*');
        expect(redis.del).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search terms', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockOrder],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });
    
      const emptySearchParams = { ...mockOrderQuerySearchParamsDto, searchText: '   ' };
      await service.findAll(emptySearchParams, 1, 20, mockUserSecure);
    
      expect(paginate).toHaveBeenCalledWith(
        orderRepository,
        {
          where: {
            OR: [],
            category: Category.BACKEND,
            status: OrderStatus.NEW,
            userId: mockUserSecure.id,
          },
          orderBy: {
            title: 'asc',
          },
          include: {
            user: true,
            customers: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
    });

    it('should handle special characters in search', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockOrder],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const specialSearchParams = { ...mockOrderQuerySearchParamsDto, searchText: 'test@order.com' };
      await service.findAll(specialSearchParams, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        orderRepository,
        {
          where: {
            OR: [
              { title: { contains: 'test@order.com', mode: 'insensitive' } },
              { description: { contains: 'test@order.com', mode: 'insensitive' } },
            ],
            category: Category.BACKEND,
            status: OrderStatus.NEW,
            userId: mockUserSecure.id,
          },
          orderBy: {
            title: 'asc',
          },
          include: {
            user: true,
            customers: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
    });

    it('should handle null orderBy in search params', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockOrder],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const paramsWithoutOrderBy = { ...mockOrderQuerySearchParamsDto };
      delete paramsWithoutOrderBy.orderBy;
      await service.findAll(paramsWithoutOrderBy, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        orderRepository,
        {
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
            category: Category.BACKEND,
            status: OrderStatus.NEW,
            userId: mockUserSecure.id,
          },
          include: {
            user: true,
            customers: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis error during cache clearing', async () => {
      orderRepository.create.mockResolvedValue(mockOrder);
      redis.keys.mockRejectedValue(new Error('Redis error'));
    
      await expect(service.create(mockCreateOrderDto, mockUserSecure)).rejects.toThrow(
        UnprocessableEntityException
      );
      expect(redis.keys).toHaveBeenCalledWith('orders:*');
    });

    it('should handle paginate error', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockRejectedValue(new Error('Paginate error'));

      await expect(
        service.findAll(mockOrderQuerySearchParamsDto, 1, 20, mockUserSecure)
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});