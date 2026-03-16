import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Concert } from '../concerts/entities/concert.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtUser } from '../common/interfaces/request-with-user.interface';
import { Role } from '../common/enums/role.enum';

const mockBookingRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockConcertRepo = {
  findOneBy: jest.fn(),
};

const mockAuditLogRepo = {};

const mockManager = {
  getRepository: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb) => cb(mockManager)),
};

const mockJwtUser: JwtUser = {
  id: 'user-1',
  username: 'testuser',
  role: Role.USER,
};

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(Concert), useValue: mockConcertRepo },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException if concert not found', async () => {
      mockConcertRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.create({ concert_id: 'c-1' }, mockJwtUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no seats available', async () => {
      mockConcertRepo.findOneBy.mockResolvedValue({
        id: 'c-1',
        available_seats: 0,
      });

      await expect(
        service.create({ concert_id: 'c-1' }, mockJwtUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if already booked', async () => {
      mockConcertRepo.findOneBy.mockResolvedValue({
        id: 'c-1',
        available_seats: 10,
      });
      mockBookingRepo.findOne.mockResolvedValue({
        id: 'b-1',
        status: BookingStatus.ACTIVE,
      });

      await expect(
        service.create({ concert_id: 'c-1' }, mockJwtUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should create booking and decrease available_seats', async () => {
      mockConcertRepo.findOneBy.mockResolvedValue({
        id: 'c-1',
        available_seats: 5,
      });
      mockBookingRepo.findOne.mockResolvedValue(null);

      const mockConcertManagerRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          withDeleted: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest
            .fn()
            .mockResolvedValue({ id: 'c-1', available_seats: 5 }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };
      const savedBooking = { id: 'b-new', status: BookingStatus.ACTIVE };
      const mockBookingManagerRepo = {
        create: jest.fn().mockReturnValue(savedBooking),
        save: jest.fn().mockResolvedValue(savedBooking),
      };
      const mockAuditManagerRepo = {
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({}),
      };

      mockManager.getRepository.mockImplementation((entity) => {
        if (entity === Concert) return mockConcertManagerRepo;
        if (entity === Booking) return mockBookingManagerRepo;
        if (entity === AuditLog) return mockAuditManagerRepo;
      });

      const result = await service.create({ concert_id: 'c-1' }, mockJwtUser);
      expect(result).toEqual(savedBooking);
      expect(mockConcertManagerRepo.update).toHaveBeenCalledWith('c-1', {
        available_seats: 4,
      });
    });

    it('should throw BadRequestException if no seats available inside transaction (race condition)', async () => {
      mockConcertRepo.findOneBy.mockResolvedValue({
        id: 'c-1',
        available_seats: 1,
      });
      mockBookingRepo.findOne.mockResolvedValue(null);

      const mockConcertManagerRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          withDeleted: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest
            .fn()
            .mockResolvedValue({ id: 'c-1', available_seats: 0 }),
        }),
      };

      mockManager.getRepository.mockImplementation((entity) => {
        if (entity === Concert) return mockConcertManagerRepo;
      });

      await expect(
        service.create({ concert_id: 'c-1' }, mockJwtUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should throw NotFoundException if booking not found', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel('b-1', mockJwtUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if already cancelled', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        id: 'b-1',
        status: BookingStatus.CANCELLED,
      });

      await expect(service.cancel('b-1', mockJwtUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should cancel booking and restore available_seats', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        id: 'b-1',
        status: BookingStatus.ACTIVE,
        concert: { id: 'c-1' },
      });

      const mockConcertManagerRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          withDeleted: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest
            .fn()
            .mockResolvedValue({ id: 'c-1', available_seats: 3 }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };
      const mockBookingManagerRepo = {
        save: jest.fn().mockResolvedValue({}),
      };
      const mockAuditManagerRepo = {
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({}),
      };

      mockManager.getRepository.mockImplementation((entity) => {
        if (entity === Concert) return mockConcertManagerRepo;
        if (entity === Booking) return mockBookingManagerRepo;
        if (entity === AuditLog) return mockAuditManagerRepo;
      });

      const result = await service.cancel('b-1', mockJwtUser);
      expect(result).toEqual({ message: 'Booking cancelled' });
      expect(mockConcertManagerRepo.update).toHaveBeenCalledWith('c-1', {
        available_seats: 4,
      });
    });

    it('should throw NotFoundException if concert not found inside transaction', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        id: 'b-1',
        status: BookingStatus.ACTIVE,
        concert: { id: 'c-1' },
      });

      const mockConcertManagerRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          withDeleted: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
      };

      mockManager.getRepository.mockImplementation((entity) => {
        if (entity === Concert) return mockConcertManagerRepo;
      });

      await expect(service.cancel('b-1', mockJwtUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMyBookings', () => {
    it('should return bookings of current user', async () => {
      const bookings = [{ id: 'b-1' }, { id: 'b-2' }];
      mockBookingRepo.find.mockResolvedValue(bookings);

      const result = await service.findMyBookings(mockJwtUser);
      expect(result).toEqual(bookings);
      expect(mockBookingRepo.find).toHaveBeenCalledWith({
        where: { user: { id: mockJwtUser.id } },
        relations: ['concert'],
        withDeleted: true,
        order: { booked_at: 'DESC' },
      });
    });
  });

  describe('findAll', () => {
    it('should return all bookings ordered by booked_at DESC', async () => {
      const bookings = [{ id: 'b-1' }, { id: 'b-2' }];
      mockBookingRepo.find.mockResolvedValue(bookings);

      const result = await service.findAll();
      expect(result).toEqual(bookings);
      expect(mockBookingRepo.find).toHaveBeenCalledWith({
        relations: ['concert'],
        withDeleted: true,
        order: { booked_at: 'DESC' },
      });
    });
  });
});
