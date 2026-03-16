import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from '../common/enums/audit-action.enum';

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
};

const mockAuditLogRepo = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepo,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    jest.clearAllMocks();
    mockAuditLogRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated logs without filters', async () => {
      const logs = [{ id: 'log-1' }, { id: 'log-2' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([logs, 2]);

      const result = await service.findAll({});

      expect(result).toEqual({
        data: logs,
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should apply default page=1 and limit=20', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should apply custom page and limit', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 3, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should calculate totalPages correctly', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 55]);

      const result = await service.findAll({ limit: 10 });

      expect(result.meta.totalPages).toBe(6);
    });

    it('should filter by concert_id', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ concert_id: 'c-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'concert.id = :concert_id',
        { concert_id: 'c-1' },
      );
    });

    it('should filter by user_id', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ user_id: 'u-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.id = :user_id',
        { user_id: 'u-1' },
      );
    });

    it('should filter by multiple actions', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        actions: [AuditAction.BOOKING_CREATED, AuditAction.BOOKING_CANCELLED],
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.action IN (:...actions)',
        {
          actions: [AuditAction.BOOKING_CREATED, AuditAction.BOOKING_CANCELLED],
        },
      );
    });
  });

  describe('findByConcert', () => {
    it('should call findAll with concert_id and pagination', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByConcert('c-1', 2, 5);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'concert.id = :concert_id',
        { concert_id: 'c-1' },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should use default pagination when not provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByConcert('c-1');

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });
});
