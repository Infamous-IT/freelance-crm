import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerRepository } from '../repository/customer.repository';
import { DatabaseService } from '../../../database/service/database.service';
import { RedisClientType } from 'redis';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { GetCustomersDto } from '../dto/get-customers.dto';
import { UserSecure } from '../../../modules/user/entities/user.entity';
import { Role, Customer, Order } from '@prisma/client';
import { PaginatedResult } from '../interfaces/customer.interface';
import { CustomerWithOrderIncludes } from '../types/customer-prisma-types.interface';

jest.mock('../../../common/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../common/pagination/paginator', () => ({
  paginate: jest.fn(),
}));

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepository: jest.Mocked<CustomerRepository>;
  let databaseService: jest.Mocked<DatabaseService>;
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

  const mockCustomer: Customer = {
    id: 'customer-1',
    fullName: 'John Customer',
    email: 'john.customer@example.com',
    telegram: 't.me/johncustomer',
    company: 'Test Company',
    orderId: null,
  };

  const mockCustomerWithOrders: CustomerWithOrderIncludes = {
    ...mockCustomer,
    order: [
      {
        id: 'order-1',
        title: 'Test Order',
        description: 'Test Description',
        price: 1000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        category: 'BACKEND' as any,
        status: 'NEW' as any,
        userId: 'user-1',
      },
    ],
  };

  const mockCreateCustomerDto: CreateCustomerDto = {
    fullName: 'John Customer',
    email: 'john.customer@example.com',
    telegram: 't.me/johncustomer',
    company: 'Test Company',
    orderIds: ['order-1'],
  };

  const mockUpdateCustomerDto: UpdateCustomerDto = {
    fullName: 'Updated Customer',
    email: 'updated.customer@example.com',
  };

  const mockGetCustomersDto: GetCustomersDto = {
    searchText: 'test',
    company: 'Test Company',
    orderBy: { field: 'fullName', sorting: 'asc' },
  };

  const mockPaginatedCustomers: PaginatedResult<any> = {
    data: [mockCustomer],
    totalCount: 1,
    totalPages: 1,
    currentPage: 1,
  };

  beforeEach(async () => {
    const mockCustomerRepository = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    };

    const mockDatabaseService = {
      order: {
        findMany: jest.fn(),
      },
    };

    const mockRedis = {
      keys: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: CustomerRepository,
          useValue: mockCustomerRepository,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    customerRepository = module.get(CustomerRepository);
    databaseService = module.get(DatabaseService);
    redis = module.get('REDIS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create customer successfully', async () => {
      customerRepository.create.mockResolvedValue(mockCustomer);
      redis.keys.mockResolvedValue(['customers:1']);
      redis.del.mockResolvedValue(1);

      const result = await service.create(mockCreateCustomerDto, mockUserSecure);

      expect(customerRepository.create).toHaveBeenCalledWith({
        data: {
          fullName: mockCreateCustomerDto.fullName,
          email: mockCreateCustomerDto.email,
          telegram: mockCreateCustomerDto.telegram,
          company: mockCreateCustomerDto.company,
          order: {
            connect: mockCreateCustomerDto.orderIds?.map((orderId) => ({ id: orderId })),
          },
        },
      });
      expect(redis.keys).toHaveBeenCalledWith('customers:*');
      expect(result).toEqual(mockCustomer);
    });

    it('should create customer without orders', async () => {
      const customerWithoutOrders = { ...mockCreateCustomerDto, orderIds: undefined };
      customerRepository.create.mockResolvedValue(mockCustomer);
      redis.keys.mockResolvedValue([]);

      const result = await service.create(customerWithoutOrders, mockUserSecure);

      expect(customerRepository.create).toHaveBeenCalledWith({
        data: {
          fullName: mockCreateCustomerDto.fullName,
          email: mockCreateCustomerDto.email,
          telegram: mockCreateCustomerDto.telegram,
          company: mockCreateCustomerDto.company,
          order: undefined,
        },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should handle service error during creation', async () => {
      customerRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateCustomerDto, mockUserSecure)).rejects.toThrow(
        UnprocessableEntityException
      );
      expect(customerRepository.create).toHaveBeenCalled();
    });
  });

  describe('addOrdersToCustomer', () => {
    it('should add orders to customer successfully for admin', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      (databaseService.order.findMany as jest.Mock).mockResolvedValue([]);
      customerRepository.update.mockResolvedValue(mockCustomerWithOrders);
      redis.keys.mockResolvedValue(['customers:1']);
      redis.del.mockResolvedValue(1);

      const result = await service.addOrdersToCustomer('customer-1', ['order-2'], mockAdminUser);

      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
      expect(customerRepository.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: {
          order: {
            connect: [{ id: 'order-2' }],
          },
        },
      });
      expect(result).toEqual(mockCustomerWithOrders);
    });

    it('should add orders to customer successfully for non-admin with own orders', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      (databaseService.order.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: 'order-2', userId: 'user-1' } as Order])
        .mockResolvedValueOnce([]);
      customerRepository.update.mockResolvedValue(mockCustomerWithOrders);
      redis.keys.mockResolvedValue([]);

      const result = await service.addOrdersToCustomer('customer-1', ['order-2'], mockUserSecure);

      expect(databaseService.order.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['order-2'] },
          userId: mockUserSecure.id,
        },
      });
      expect(result).toEqual(mockCustomerWithOrders);
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.addOrdersToCustomer('non-existent', ['order-1'], mockUserSecure)
      ).rejects.toThrow(NotFoundException);
      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        include: { order: true },
      });
    });

    it('should throw ForbiddenException when non-admin tries to add others orders', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      (databaseService.order.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.addOrdersToCustomer('customer-1', ['order-2'], mockUserSecure)
      ).rejects.toThrow(ForbiddenException);
      expect(databaseService.order.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['order-2'] },
          userId: mockUserSecure.id,
        },
      });
    });

    it('should throw error when orders are already assigned', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      (databaseService.order.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: 'order-2', userId: 'user-1' } as Order])
        .mockResolvedValueOnce([{ id: 'order-2' } as Order]);

      await expect(
        service.addOrdersToCustomer('customer-1', ['order-2'], mockUserSecure)
      ).rejects.toThrow('Some orders are already assigned to a customer');
    });

    it('should handle service error during adding orders', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      (databaseService.order.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: 'order-2', userId: 'user-1' } as Order])
        .mockResolvedValueOnce([]);
      customerRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.addOrdersToCustomer('customer-1', ['order-2'], mockUserSecure)
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('findAll', () => {
    it('should return paginated customers for admin user', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockCustomer],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const result = await service.findAll(mockGetCustomersDto, 1, 20, mockAdminUser);

      expect(paginate).toHaveBeenCalledWith(
        customerRepository,
        {
          where: {
            OR: [
              { fullName: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
              { company: { contains: 'test', mode: 'insensitive' } },
            ],
            company: {
              contains: 'Test Company',
              mode: 'insensitive',
            },
          },
          orderBy: {
            fullName: 'asc',
          },
          include: {
            order: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
      expect(result).toEqual(mockPaginatedCustomers);
    });

    it('should return paginated customers for non-admin user (only their customers)', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockCustomer],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const result = await service.findAll(mockGetCustomersDto, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        customerRepository,
        {
          where: {
            OR: [
              { fullName: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
              { company: { contains: 'test', mode: 'insensitive' } },
            ],
            company: {
              contains: 'Test Company',
              mode: 'insensitive',
            },
            order: {
              some: {
                userId: mockUserSecure.id,
              },
            },
          },
          orderBy: {
            fullName: 'asc',
          },
          include: {
            order: true,
          },
        },
        {
          page: 1,
          perPage: 20,
        }
      );
      expect(result).toEqual(mockPaginatedCustomers);
    });

    it('should handle empty search text', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockCustomer],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const emptySearchParams = { ...mockGetCustomersDto, searchText: undefined };
      await service.findAll(emptySearchParams, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        customerRepository,
        {
          where: {
            company: {
              contains: 'Test Company',
              mode: 'insensitive',
            },
            order: {
              some: {
                userId: mockUserSecure.id,
              },
            },
          },
          orderBy: {
            fullName: 'asc',
          },
          include: {
            order: true,
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
        service.findAll(mockGetCustomersDto, 1, 20, mockUserSecure)
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('findOne', () => {
    it('should return customer from cache for admin user', async () => {
      const cachedCustomer = { 
        ...mockCustomerWithOrders, 
        order: mockCustomerWithOrders.order.map(order => ({
          ...order,
          startDate: order.startDate.toISOString(),
          endDate: order.endDate.toISOString(),
        })) || [] 
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedCustomer));

      const result = await service.findOne('customer-1', mockAdminUser);

      expect(redis.get).toHaveBeenCalledWith('customer:customer-1');
      expect(result).toEqual(cachedCustomer);
    });

    it('should return customer from cache for non-admin user with access', async () => {
      const cachedCustomer = { 
        ...mockCustomerWithOrders, 
        order: mockCustomerWithOrders.order.map(order => ({
          ...order,
          startDate: order.startDate.toISOString(),
          endDate: order.endDate.toISOString(),
        })) || [] 
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedCustomer));

      const result = await service.findOne('customer-1', mockUserSecure);

      expect(redis.get).toHaveBeenCalledWith('customer:customer-1');
      expect(result).toEqual(cachedCustomer);
    });

    it('should throw ForbiddenException for non-admin user without access to cached customer', async () => {
      const cachedCustomer = {
        ...mockCustomerWithOrders,
        order: [{ ...mockCustomerWithOrders.order[0], userId: 'other-user' }],
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedCustomer));

      await expect(service.findOne('customer-1', mockUserSecure)).rejects.toThrow(
        ForbiddenException
      );
      expect(redis.get).toHaveBeenCalledWith('customer:customer-1');
    });

    it('should return customer from database when not in cache', async () => {
      redis.get.mockResolvedValue(null);
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      redis.set.mockResolvedValue('OK');

      const result = await service.findOne('customer-1', mockUserSecure);

      expect(redis.get).toHaveBeenCalledWith('customer:customer-1');
      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
      expect(redis.set).toHaveBeenCalledWith(
        'customer:customer-1',
        JSON.stringify({ ...mockCustomerWithOrders, order: mockCustomerWithOrders.order || [] }),
        { EX: 300 }
      );
      expect(result).toEqual(mockCustomerWithOrders);
    });

    it('should throw NotFoundException when customer not found in database', async () => {
      redis.get.mockResolvedValue(null);
      customerRepository.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockUserSecure)).rejects.toThrow(
        NotFoundException
      );
      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        include: { order: true },
      });
    });

    it('should throw ForbiddenException for non-admin user without access to database customer', async () => {
      redis.get.mockResolvedValue(null);
      const customerWithoutAccess = {
        ...mockCustomerWithOrders,
        order: [{ ...mockCustomerWithOrders.order[0], userId: 'other-user' }],
      };
      customerRepository.findUnique.mockResolvedValue(customerWithoutAccess);

      await expect(service.findOne('customer-1', mockUserSecure)).rejects.toThrow(
        ForbiddenException
      );
      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
    });
  });

  describe('update', () => {
    it('should update customer successfully for admin user', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      customerRepository.update.mockResolvedValue(mockCustomer);
      redis.keys.mockResolvedValue(['customers:1']);
      redis.del.mockResolvedValue(1);

      const result = await service.update('customer-1', mockUpdateCustomerDto, mockAdminUser);

      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
      expect(customerRepository.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: mockUpdateCustomerDto,
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should update customer successfully for non-admin user with access', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      customerRepository.update.mockResolvedValue(mockCustomer);
      redis.keys.mockResolvedValue([]);

      const result = await service.update('customer-1', mockUpdateCustomerDto, mockUserSecure);

      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
      expect(customerRepository.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: mockUpdateCustomerDto,
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', mockUpdateCustomerDto, mockUserSecure)
      ).rejects.toThrow(NotFoundException);
      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        include: { order: true },
      });
    });

    it('should throw ForbiddenException for non-admin user without access', async () => {
      const customerWithoutAccess = {
        ...mockCustomerWithOrders,
        order: [{ ...mockCustomerWithOrders.order[0], userId: 'other-user' }],
      };
      customerRepository.findUnique.mockResolvedValue(customerWithoutAccess);

      await expect(
        service.update('customer-1', mockUpdateCustomerDto, mockUserSecure)
      ).rejects.toThrow(ForbiddenException);
      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
    });

    it('should handle service error during update', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      customerRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update('customer-1', mockUpdateCustomerDto, mockUserSecure)
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('remove', () => {
    it('should remove customer successfully for admin user', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      customerRepository.delete.mockResolvedValue(mockCustomer);
      redis.keys.mockResolvedValue(['customers:1']);
      redis.del.mockResolvedValue(1);

      const result = await service.remove('customer-1', mockAdminUser);

      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
      expect(customerRepository.delete).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should remove customer successfully for non-admin user with access', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      customerRepository.delete.mockResolvedValue(mockCustomer);
      redis.keys.mockResolvedValue([]);

      const result = await service.remove('customer-1', mockUserSecure);

      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
      expect(customerRepository.delete).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerRepository.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockUserSecure)).rejects.toThrow(
        NotFoundException
      );
      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        include: { order: true },
      });
    });

    it('should throw ForbiddenException for non-admin user without access', async () => {
      const customerWithoutAccess = {
        ...mockCustomerWithOrders,
        order: [{ ...mockCustomerWithOrders.order[0], userId: 'other-user' }],
      };
      customerRepository.findUnique.mockResolvedValue(customerWithoutAccess);

      await expect(service.remove('customer-1', mockUserSecure)).rejects.toThrow(
        ForbiddenException
      );
      expect(customerRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { order: true },
      });
    });

    it('should handle service error during remove', async () => {
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      customerRepository.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove('customer-1', mockUserSecure)).rejects.toThrow(
        UnprocessableEntityException
      );
    });
  });

  describe('private methods', () => {
    describe('clearCache', () => {
      it('should clear cache when keys exist', async () => {
        redis.keys.mockResolvedValue(['customers:1', 'customers:2']);
        redis.del.mockResolvedValue(2);

        await (service as any).clearCache();

        expect(redis.keys).toHaveBeenCalledWith('customers:*');
        expect(redis.del).toHaveBeenCalledWith(['customers:1', 'customers:2']);
      });

      it('should handle empty cache keys', async () => {
        redis.keys.mockResolvedValue([]);

        await (service as any).clearCache();

        expect(redis.keys).toHaveBeenCalledWith('customers:*');
        expect(redis.del).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search terms in findAll', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockResolvedValue({
        data: [mockCustomer],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const emptySearchParams = { ...mockGetCustomersDto, searchText: '   ' };
      await service.findAll(emptySearchParams, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        customerRepository,
        {
          where: {
            OR: [],
            company: {
              contains: 'Test Company',
              mode: 'insensitive',
            },
            order: {
              some: {
                userId: mockUserSecure.id,
              },
            },
          },
          orderBy: {
            fullName: 'asc',
          },
          include: {
            order: true,
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
        data: [mockCustomer],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
        },
      });

      const paramsWithoutOrderBy = { ...mockGetCustomersDto };
      delete paramsWithoutOrderBy.orderBy;
      await service.findAll(paramsWithoutOrderBy, 1, 20, mockUserSecure);

      expect(paginate).toHaveBeenCalledWith(
        customerRepository,
        {
          where: {
            OR: [
              { fullName: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
              { company: { contains: 'test', mode: 'insensitive' } },
            ],
            company: {
              contains: 'Test Company',
              mode: 'insensitive',
            },
            order: {
              some: {
                userId: mockUserSecure.id,
              },
            },
          },
          include: {
            order: true,
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
    it('should handle Redis error during cache operations', async () => {
      redis.get.mockResolvedValue(null);
      customerRepository.findUnique.mockResolvedValue(mockCustomerWithOrders);
      redis.set.mockResolvedValue('OK');

      const result = await service.findOne('customer-1', mockUserSecure);

      expect(result).toEqual(mockCustomerWithOrders);
      expect(redis.get).toHaveBeenCalledWith('customer:customer-1');
    });

    it('should handle paginate error', async () => {
      const { paginate } = require('../../../common/pagination/paginator');
      paginate.mockRejectedValue(new Error('Paginate error'));

      await expect(
        service.findAll(mockGetCustomersDto, 1, 20, mockUserSecure)
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});