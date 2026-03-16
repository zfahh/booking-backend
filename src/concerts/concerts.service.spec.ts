import { Test, TestingModule } from '@nestjs/testing';
import { ConcertsService } from './concerts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Concert } from './entities/concert.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtUser } from '../common/interfaces/request-with-user.interface';
import { Role } from '../common/enums/role.enum';

const mockConcertRepo = {
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softRemove: jest.fn(),
};

const mockBookingRepo = {
  count: jest.fn(),
};

const mockAuditLogRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockAdminUser: JwtUser = {
  id: 'user-1',
  username: 'admin',
  role: Role.ADMIN,
};

describe('ConcertsService', () => {
  let service: ConcertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcertsService,
        { provide: getRepositoryToken(Concert), useValue: mockConcertRepo },
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
      ],
    }).compile();

    service = module.get<ConcertsService>(ConcertsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create concert and write audit log', async () => {
      const dto = { name: 'BTS Concert', total_seats: 100 };
      const concert = { id: 'c-1', ...dto, available_seats: 100 };

      mockConcertRepo.create.mockReturnValue(concert);
      mockConcertRepo.save.mockResolvedValue(concert);
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});

      const result = await service.create(dto, mockAdminUser);

      expect(result).toEqual(concert);
      expect(mockAuditLogRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return concert if found', async () => {
      const concert = { id: 'c-1', name: 'BTS Concert' };
      mockConcertRepo.findOneBy.mockResolvedValue(concert);

      const result = await service.findOne('c-1');
      expect(result).toEqual(concert);
    });

    it('should throw NotFoundException if not found', async () => {
      mockConcertRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('wrong-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all concerts', async () => {
      const concerts = [{ id: 'c-1' }, { id: 'c-2' }];
      mockConcertRepo.find.mockResolvedValue(concerts);

      const result = await service.findAll();
      expect(result).toEqual(concerts);
      expect(mockConcertRepo.find).toHaveBeenCalledWith({
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('update', () => {
    it('should update concert and write audit log', async () => {
      const concert = { id: 'c-1', name: 'Old Name', total_seats: 100, available_seats: 90 };
      const updated = { ...concert, name: 'New Name' };

      mockConcertRepo.findOneBy.mockResolvedValue(concert);
      mockConcertRepo.save.mockResolvedValue(updated);
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});

      const result = await service.update('c-1', { name: 'New Name' }, mockAdminUser);
      expect(result).toEqual(updated);
      expect(mockAuditLogRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if total_seats < active bookings', async () => {
      const concert = { id: 'c-1', name: 'BTS', total_seats: 100, available_seats: 90 };
      mockConcertRepo.findOneBy.mockResolvedValue(concert);
      mockBookingRepo.count.mockResolvedValue(15);

      await expect(
        service.update('c-1', { total_seats: 10 }, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate available_seats when total_seats updated', async () => {
      const concert = { id: 'c-1', name: 'BTS', total_seats: 100, available_seats: 90 };
      mockConcertRepo.findOneBy.mockResolvedValue(concert);
      mockBookingRepo.count.mockResolvedValue(10);
      mockConcertRepo.save.mockResolvedValue({ ...concert, total_seats: 50, available_seats: 40 });
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});

      await service.update('c-1', { total_seats: 50 }, mockAdminUser);

      // available_seats = total_seats(50) - activeBookings(10) = 40
      expect(concert.available_seats).toBe(40);
    });

    it('should throw NotFoundException if concert not found', async () => {
      mockConcertRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('wrong-id', { name: 'X' }, mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete concert if no active bookings', async () => {
      const concert = { id: 'c-1', name: 'BTS Concert' };
      mockConcertRepo.findOneBy.mockResolvedValue(concert);
      mockBookingRepo.count.mockResolvedValue(0);
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});
      mockConcertRepo.softRemove.mockResolvedValue({});

      const result = await service.remove('c-1', mockAdminUser);
      expect(result).toEqual({ message: 'Concert deleted' });
      expect(mockConcertRepo.softRemove).toHaveBeenCalledWith(concert);
    });

    it('should throw ConflictException if active bookings exist', async () => {
      const concert = { id: 'c-1', name: 'BTS Concert' };
      mockConcertRepo.findOneBy.mockResolvedValue(concert);
      mockBookingRepo.count.mockResolvedValue(3);

      await expect(service.remove('c-1', mockAdminUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
