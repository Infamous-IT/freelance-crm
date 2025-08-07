import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from '../service/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { GetCustomersDto } from '../dto/get-customers.dto';
import { CustomerIdParamDto } from '../../../common/dtos/customer-id-param.dto';
import { UserSecure } from '../../../modules/user/entities/user.entity';
import { Role, Customer } from '@prisma/client';
import { CustomerResponse } from '../responses/customer.response';
import { PaginatedResult } from '../interfaces/customer.interface';
import { AuthRolesGuard } from '../../../common/guards/user-auth.guard';
import { TransformInterceptor } from '../../../app/interceptors/transform.interceptor';
import { PaginatedTransformInterceptor } from '../../../app/interceptors/paginated-transform.interceptor';

jest.mock('../../../common/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('CustomerController', () => {
  let controller: CustomerController;
  let customerService: jest.Mocked<CustomerService>;

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

  const mockCustomer: Customer = {
    id: 'customer-1',
    fullName: 'John Customer',
    email: 'john.customer@example.com',
    telegram: 't.me/johncustomer',
    company: 'Test Company',
    orderId: null,
  };

  const mockCustomerResponse: CustomerResponse = {
    id: 'customer-1',
    fullName: 'John Customer',
    email: 'john.customer@example.com',
    telegram: 't.me/johncustomer',
    company: 'Test Company'
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

  const mockPaginatedCustomers: PaginatedResult<CustomerResponse> = {
    data: [mockCustomerResponse],
    totalCount: 1,
    totalPages: 1,
    currentPage: 1,
  };

  const mockCustomerIdParam: CustomerIdParamDto = {
    customerId: 'customer-1',
  };

  beforeEach(async () => {
    const mockCustomerService = {
      create: jest.fn(),
      addOrdersToCustomer: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
      ],
    })
      .overrideGuard(AuthRolesGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(TransformInterceptor)
      .useValue({ intercept: () => ({}) })
      .overrideInterceptor(PaginatedTransformInterceptor)
      .useValue({ intercept: () => ({}) })
      .compile();

    controller = module.get<CustomerController>(CustomerController);
    customerService = module.get(CustomerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create customer successfully', async () => {
      customerService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create(mockCreateCustomerDto, mockUserSecure);

      expect(customerService.create).toHaveBeenCalledWith(mockCreateCustomerDto, mockUserSecure);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should handle service error during creation', async () => {
      customerService.create.mockRejectedValue(new Error('Service error'));

      await expect(controller.create(mockCreateCustomerDto, mockUserSecure)).rejects.toThrow(
        'Service error'
      );
      expect(customerService.create).toHaveBeenCalledWith(mockCreateCustomerDto, mockUserSecure);
    });

    it('should transform response to CustomerResponse', async () => {
      customerService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create(mockCreateCustomerDto, mockUserSecure);

      expect(customerService.create).toHaveBeenCalledWith(mockCreateCustomerDto, mockUserSecure);
      expect(result).toBeDefined();
    });
  });

  describe('addOrdersToCustomer', () => {
    it('should add orders to customer successfully', async () => {
      const orderIds = ['order-1', 'order-2'];
      customerService.addOrdersToCustomer.mockResolvedValue(mockCustomer);

      const result = await controller.addOrdersToCustomer(
        mockCustomerIdParam,
        { orderIds },
        mockUserSecure
      );

      expect(customerService.addOrdersToCustomer).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        orderIds,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle service error during adding orders', async () => {
      const orderIds = ['order-1'];
      customerService.addOrdersToCustomer.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.addOrdersToCustomer(mockCustomerIdParam, { orderIds }, mockUserSecure)
      ).rejects.toThrow('Service error');
      expect(customerService.addOrdersToCustomer).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        orderIds,
        mockUserSecure
      );
    });

    it('should transform response to CustomerResponse', async () => {
      const orderIds = ['order-1'];
      customerService.addOrdersToCustomer.mockResolvedValue(mockCustomer);

      const result = await controller.addOrdersToCustomer(
        mockCustomerIdParam,
        { orderIds },
        mockUserSecure
      );

      expect(customerService.addOrdersToCustomer).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        orderIds,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });
  });

  describe('getAllPaginated', () => {
    it('should return paginated customers successfully', async () => {
      customerService.findAll.mockResolvedValue(mockPaginatedCustomers);

      const result = await controller.getAllPaginated(
        mockGetCustomersDto,
        1,
        20,
        mockUserSecure
      );

      expect(customerService.findAll).toHaveBeenCalledWith(
        mockGetCustomersDto,
        1,
        20,
        mockUserSecure
      );
      expect(result).toEqual(mockPaginatedCustomers);
    });

    it('should handle service error during findAll', async () => {
      customerService.findAll.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getAllPaginated(mockGetCustomersDto, 1, 20, mockUserSecure)
      ).rejects.toThrow('Service error');
      expect(customerService.findAll).toHaveBeenCalledWith(
        mockGetCustomersDto,
        1,
        20,
        mockUserSecure
      );
    });

    it('should use default pagination values', async () => {
      customerService.findAll.mockResolvedValue(mockPaginatedCustomers);

      const result = await controller.getAllPaginated(
        mockGetCustomersDto,
        undefined,
        undefined,
        mockUserSecure
      );

      expect(customerService.findAll).toHaveBeenCalledWith(
        mockGetCustomersDto,
        1,
        20,
        mockUserSecure
      );
      expect(result).toEqual(mockPaginatedCustomers);
    });

    it('should handle empty search parameters', async () => {
      const emptySearchParams: GetCustomersDto = { ...mockGetCustomersDto, searchText: undefined };
      customerService.findAll.mockResolvedValue(mockPaginatedCustomers);

      const result = await controller.getAllPaginated(
        emptySearchParams,
        1,
        20,
        mockUserSecure
      );

      expect(customerService.findAll).toHaveBeenCalledWith(
        emptySearchParams,
        1,
        20,
        mockUserSecure
      );
      expect(result).toEqual(mockPaginatedCustomers);
    });
  });

  describe('findOne', () => {
    it('should return customer by ID successfully', async () => {
      customerService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne(mockCustomerIdParam, mockUserSecure);

      expect(customerService.findOne).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle service error during findOne', async () => {
      customerService.findOne.mockRejectedValue(new Error('Service error'));

      await expect(controller.findOne(mockCustomerIdParam, mockUserSecure)).rejects.toThrow(
        'Service error'
      );
      expect(customerService.findOne).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
    });

    it('should transform response to CustomerResponse', async () => {
      customerService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne(mockCustomerIdParam, mockUserSecure);

      expect(customerService.findOne).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle customer not found', async () => {
      customerService.findOne.mockRejectedValue(new Error('Customer not found'));

      await expect(controller.findOne(mockCustomerIdParam, mockUserSecure)).rejects.toThrow(
        'Customer not found'
      );
      expect(customerService.findOne).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
    });
  });

  describe('update', () => {
    it('should update customer successfully', async () => {
      customerService.update.mockResolvedValue(mockCustomer);

      const result = await controller.update(
        mockCustomerIdParam,
        mockUpdateCustomerDto,
        mockUserSecure
      );

      expect(customerService.update).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUpdateCustomerDto,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle service error during update', async () => {
      customerService.update.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.update(mockCustomerIdParam, mockUpdateCustomerDto, mockUserSecure)
      ).rejects.toThrow('Service error');
      expect(customerService.update).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUpdateCustomerDto,
        mockUserSecure
      );
    });

    it('should transform response to CustomerResponse', async () => {
      customerService.update.mockResolvedValue(mockCustomer);

      const result = await controller.update(
        mockCustomerIdParam,
        mockUpdateCustomerDto,
        mockUserSecure
      );

      expect(customerService.update).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUpdateCustomerDto,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle customer not found during update', async () => {
      customerService.update.mockRejectedValue(new Error('Customer not found'));

      await expect(
        controller.update(mockCustomerIdParam, mockUpdateCustomerDto, mockUserSecure)
      ).rejects.toThrow('Customer not found');
      expect(customerService.update).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUpdateCustomerDto,
        mockUserSecure
      );
    });
  });

  describe('remove', () => {
    it('should remove customer successfully', async () => {
      customerService.remove.mockResolvedValue(mockCustomer);

      const result = await controller.remove(mockCustomerIdParam, mockUserSecure);

      expect(customerService.remove).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle service error during remove', async () => {
      customerService.remove.mockRejectedValue(new Error('Service error'));

      await expect(controller.remove(mockCustomerIdParam, mockUserSecure)).rejects.toThrow(
        'Service error'
      );
      expect(customerService.remove).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
    });

    it('should transform response to CustomerResponse', async () => {
      customerService.remove.mockResolvedValue(mockCustomer);

      const result = await controller.remove(mockCustomerIdParam, mockUserSecure);

      expect(customerService.remove).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle customer not found during remove', async () => {
      customerService.remove.mockRejectedValue(new Error('Customer not found'));

      await expect(controller.remove(mockCustomerIdParam, mockUserSecure)).rejects.toThrow(
        'Customer not found'
      );
      expect(customerService.remove).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty orderIds in addOrdersToCustomer', async () => {
      const emptyOrderIds: string[] = [];
      customerService.addOrdersToCustomer.mockResolvedValue(mockCustomer);

      const result = await controller.addOrdersToCustomer(
        mockCustomerIdParam,
        { orderIds: emptyOrderIds },
        mockUserSecure
      );

      expect(customerService.addOrdersToCustomer).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        emptyOrderIds,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle undefined searchText in getAllPaginated', async () => {
      const undefinedSearchParams: GetCustomersDto = { ...mockGetCustomersDto, searchText: undefined };
      customerService.findAll.mockResolvedValue(mockPaginatedCustomers);

      const result = await controller.getAllPaginated(
        undefinedSearchParams,
        1,
        20,
        mockUserSecure
      );

      expect(customerService.findAll).toHaveBeenCalledWith(
        undefinedSearchParams,
        1,
        20,
        mockUserSecure
      );
      expect(result).toEqual(mockPaginatedCustomers);
    });

    it('should handle undefined orderBy in getAllPaginated', async () => {
      const undefinedOrderByParams: GetCustomersDto = { ...mockGetCustomersDto };
      delete undefinedOrderByParams.orderBy;
      customerService.findAll.mockResolvedValue(mockPaginatedCustomers);

      const result = await controller.getAllPaginated(
        undefinedOrderByParams,
        1,
        20,
        mockUserSecure
      );

      expect(customerService.findAll).toHaveBeenCalledWith(
        undefinedOrderByParams,
        1,
        20,
        mockUserSecure
      );
      expect(result).toEqual(mockPaginatedCustomers);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors in create', async () => {
      const invalidDto = { ...mockCreateCustomerDto, email: 'invalid-email' };
      customerService.create.mockRejectedValue(new Error('Validation error'));

      await expect(controller.create(invalidDto, mockUserSecure)).rejects.toThrow(
        'Validation error'
      );
      expect(customerService.create).toHaveBeenCalledWith(invalidDto, mockUserSecure);
    });

    it('should handle database errors in findAll', async () => {
      customerService.findAll.mockRejectedValue(new Error('Database connection error'));

      await expect(
        controller.getAllPaginated(mockGetCustomersDto, 1, 20, mockUserSecure)
      ).rejects.toThrow('Database connection error');
      expect(customerService.findAll).toHaveBeenCalledWith(
        mockGetCustomersDto,
        1,
        20,
        mockUserSecure
      );
    });

    it('should handle authorization errors in findOne', async () => {
      customerService.findOne.mockRejectedValue(new Error('Access denied'));

      await expect(controller.findOne(mockCustomerIdParam, mockUserSecure)).rejects.toThrow(
        'Access denied'
      );
      expect(customerService.findOne).toHaveBeenCalledWith(
        mockCustomerIdParam.customerId,
        mockUserSecure
      );
    });
  });

  describe('Integration with AbstractController', () => {
    it('should use transformToObject method from AbstractController', async () => {
      customerService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create(mockCreateCustomerDto, mockUserSecure);

      expect(customerService.create).toHaveBeenCalledWith(mockCreateCustomerDto, mockUserSecure);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should handle transformation errors gracefully', async () => {
      customerService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create(mockCreateCustomerDto, mockUserSecure);

      expect(customerService.create).toHaveBeenCalledWith(mockCreateCustomerDto, mockUserSecure);
      expect(result).toBeDefined();
    });
  });
});