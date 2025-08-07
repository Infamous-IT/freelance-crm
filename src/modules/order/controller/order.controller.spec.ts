import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from '../service/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderQuerySearchParamsDto } from '../dto/order-query-search-params.dto';
import { OrderIdParamDto } from '../../../common/dtos/order-id-param.dto';
import { UserSecure } from '../../../modules/user/entities/user.entity';
import { Role, Category, OrderStatus, Order } from '@prisma/client';
import { OrderResponse } from '../responses/order.response';
import { PaginatedOrders } from '../interfaces/order.interface';
import { OrderWithRelationIncludes } from '../types/order-prisma-types.interface';
import { AuthRolesGuard } from '../../../common/guards/user-auth.guard';
import { TransformInterceptor } from '../../../app/interceptors/transform.interceptor';
import { PaginatedTransformInterceptor } from '../../../app/interceptors/paginated-transform.interceptor';

jest.mock('../../../common/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<OrderService>;

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
    page: 1,
    perPage: 20,
  };

  const mockPaginatedOrders: PaginatedOrders = {
    data: [mockOrder],
    totalCount: 1,
    totalPages: 1,
    currentPage: 1,
  };

  const mockOrderIdParamDto: OrderIdParamDto = {
    orderId: 'order-1',
  };

  beforeEach(async () => {
    const mockOrderService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
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

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create order successfully', async () => {
      orderService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(mockCreateOrderDto, mockUserSecure);

      expect(orderService.create).toHaveBeenCalledWith(mockCreateOrderDto, mockUserSecure);
      expect(result).toBeDefined();
    });

    it('should handle service error during creation', async () => {
      orderService.create.mockRejectedValue(new Error('Service error'));

      await expect(controller.create(mockCreateOrderDto, mockUserSecure)).rejects.toThrow(
        'Service error'
      );
      expect(orderService.create).toHaveBeenCalledWith(mockCreateOrderDto, mockUserSecure);
    });
  });

  describe('getAllPaginated', () => {
    it('should return paginated orders successfully', async () => {
      orderService.findAll.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.getAllPaginated(mockOrderQuerySearchParamsDto, mockUserSecure);

      expect(orderService.findAll).toHaveBeenCalledWith(
        mockOrderQuerySearchParamsDto,
        1,
        20,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle pagination parameters correctly', async () => {
      const customParams = {
        ...mockOrderQuerySearchParamsDto,
        page: 2,
        perPage: 10,
      };
      orderService.findAll.mockResolvedValue(mockPaginatedOrders);

      await controller.getAllPaginated(customParams, mockUserSecure);

      expect(orderService.findAll).toHaveBeenCalledWith(
        customParams,
        2,
        10,
        mockUserSecure
      );
    });

    it('should handle service error during findAll', async () => {
      orderService.findAll.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getAllPaginated(mockOrderQuerySearchParamsDto, mockUserSecure)
      ).rejects.toThrow('Service error');
      expect(orderService.findAll).toHaveBeenCalledWith(
        mockOrderQuerySearchParamsDto,
        1,
        20,
        mockUserSecure
      );
    });
  });

  describe('findOne', () => {
    it('should return order by ID successfully', async () => {
      orderService.findOne.mockResolvedValue(mockOrderWithRelations);

      const result = await controller.findOne(mockOrderIdParamDto, mockUserSecure);

      expect(orderService.findOne).toHaveBeenCalledWith(mockOrderIdParamDto.orderId, mockUserSecure);
      expect(result).toBeDefined();
    });

    it('should handle service error during findOne', async () => {
      orderService.findOne.mockRejectedValue(new Error('Service error'));

      await expect(controller.findOne(mockOrderIdParamDto, mockUserSecure)).rejects.toThrow(
        'Service error'
      );
      expect(orderService.findOne).toHaveBeenCalledWith(mockOrderIdParamDto.orderId, mockUserSecure);
    });

    it('should handle order not found', async () => {
      orderService.findOne.mockRejectedValue(new Error('Order not found'));

      await expect(controller.findOne(mockOrderIdParamDto, mockUserSecure)).rejects.toThrow(
        'Order not found'
      );
      expect(orderService.findOne).toHaveBeenCalledWith(mockOrderIdParamDto.orderId, mockUserSecure);
    });
  });

  describe('update', () => {
    it('should update order successfully', async () => {
      orderService.update.mockResolvedValue(mockOrder);

      const result = await controller.update(mockOrderIdParamDto, mockUpdateOrderDto, mockUserSecure);

      expect(orderService.update).toHaveBeenCalledWith(
        mockOrderIdParamDto.orderId,
        mockUpdateOrderDto,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle service error during update', async () => {
      orderService.update.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.update(mockOrderIdParamDto, mockUpdateOrderDto, mockUserSecure)
      ).rejects.toThrow('Service error');
      expect(orderService.update).toHaveBeenCalledWith(
        mockOrderIdParamDto.orderId,
        mockUpdateOrderDto,
        mockUserSecure
      );
    });

    it('should handle order not found during update', async () => {
      orderService.update.mockRejectedValue(new Error('Order not found'));

      await expect(
        controller.update(mockOrderIdParamDto, mockUpdateOrderDto, mockUserSecure)
      ).rejects.toThrow('Order not found');
      expect(orderService.update).toHaveBeenCalledWith(
        mockOrderIdParamDto.orderId,
        mockUpdateOrderDto,
        mockUserSecure
      );
    });
  });

  describe('remove', () => {
    it('should remove order successfully', async () => {
      orderService.remove.mockResolvedValue(mockOrder);

      const result = await controller.remove(mockOrderIdParamDto, mockUserSecure);

      expect(orderService.remove).toHaveBeenCalledWith(mockOrderIdParamDto.orderId, mockUserSecure);
      expect(result).toBeDefined();
    });

    it('should handle service error during remove', async () => {
      orderService.remove.mockRejectedValue(new Error('Service error'));

      await expect(controller.remove(mockOrderIdParamDto, mockUserSecure)).rejects.toThrow(
        'Service error'
      );
      expect(orderService.remove).toHaveBeenCalledWith(mockOrderIdParamDto.orderId, mockUserSecure);
    });

    it('should handle order not found during remove', async () => {
      orderService.remove.mockRejectedValue(new Error('Order not found'));

      await expect(controller.remove(mockOrderIdParamDto, mockUserSecure)).rejects.toThrow(
        'Order not found'
      );
      expect(orderService.remove).toHaveBeenCalledWith(mockOrderIdParamDto.orderId, mockUserSecure);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search parameters', async () => {
      const emptyParams = { ...mockOrderQuerySearchParamsDto, searchText: undefined };
      orderService.findAll.mockResolvedValue(mockPaginatedOrders);

      await controller.getAllPaginated(emptyParams, mockUserSecure);

      expect(orderService.findAll).toHaveBeenCalledWith(
        emptyParams,
        1,
        20,
        mockUserSecure
      );
    });

    it('should handle null orderBy in search params', async () => {
      const paramsWithoutOrderBy = { ...mockOrderQuerySearchParamsDto };
      delete paramsWithoutOrderBy.orderBy;
      orderService.findAll.mockResolvedValue(mockPaginatedOrders);

      await controller.getAllPaginated(paramsWithoutOrderBy, mockUserSecure);

      expect(orderService.findAll).toHaveBeenCalledWith(
        paramsWithoutOrderBy,
        1,
        20,
        mockUserSecure
      );
    });

    it('should handle partial update DTO', async () => {
      const partialUpdateDto: UpdateOrderDto = {
        title: 'Partial Update',
      };
      orderService.update.mockResolvedValue(mockOrder);

      await controller.update(mockOrderIdParamDto, partialUpdateDto, mockUserSecure);

      expect(orderService.update).toHaveBeenCalledWith(
        mockOrderIdParamDto.orderId,
        partialUpdateDto,
        mockUserSecure
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const invalidCreateDto = {
        ...mockCreateOrderDto,
        title: '',
      };
      orderService.create.mockRejectedValue(new Error('Validation error'));

      await expect(controller.create(invalidCreateDto as any, mockUserSecure)).rejects.toThrow(
        'Validation error'
      );
    });

    it('should handle database errors', async () => {
      orderService.create.mockRejectedValue(new Error('Database connection error'));

      await expect(controller.create(mockCreateOrderDto, mockUserSecure)).rejects.toThrow(
        'Database connection error'
      );
    });

    it('should handle authorization errors', async () => {
      orderService.findOne.mockRejectedValue(new Error('Access denied'));

      await expect(controller.findOne(mockOrderIdParamDto, mockUserSecure)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('Integration with AbstractController', () => {
    it('should use transformToObject method', async () => {
      orderService.create.mockResolvedValue(mockOrder);
      const transformSpy = jest.spyOn(controller as any, 'transformToObject');

      await controller.create(mockCreateOrderDto, mockUserSecure);

      expect(transformSpy).toHaveBeenCalledWith(mockOrder, OrderResponse);
    });

    it('should use transformToArray method', async () => {
      orderService.findAll.mockResolvedValue(mockPaginatedOrders);
      const transformSpy = jest.spyOn(controller as any, 'transformToArray');

      await controller.getAllPaginated(mockOrderQuerySearchParamsDto, mockUserSecure);

      expect(transformSpy).toHaveBeenCalledWith(mockPaginatedOrders.data, OrderResponse);
    });
  });
});