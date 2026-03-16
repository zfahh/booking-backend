import {
  Injectable, NotFoundException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Concert } from '../concerts/entities/concert.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { JwtUser } from '../common/interfaces/request-with-user.interface';
import { AuditAction } from '../common/enums/audit-action.enum';
import { CreateBookingDto } from './dto/create-booking.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Concert)
    private readonly concertRepo: Repository<Concert>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateBookingDto, jwtUser: JwtUser) {
    const concert = await this.concertRepo.findOneBy({ id: dto.concert_id });
    if (!concert) throw new NotFoundException('Concert not found');

    if (concert.available_seats <= 0) {
      throw new BadRequestException('No seats available');
    }

    const existing = await this.bookingRepo.findOne({
      where: {
        user: { id: jwtUser.id },
        concert: { id: dto.concert_id },
        status: BookingStatus.ACTIVE,
      },
    });
    if (existing) throw new ConflictException('Already booked this concert');

    return await this.dataSource.transaction(async (manager) => {
      const lockedConcert = await manager
        .getRepository(Concert)
        .createQueryBuilder('concert')
        .setLock('pessimistic_write')
        .where('concert.id = :id', { id: dto.concert_id })
        .getOne();

      if (!lockedConcert || lockedConcert.available_seats <= 0) {
        throw new BadRequestException('No seats available');
      }

      await manager.getRepository(Concert).update(dto.concert_id, {
        available_seats: lockedConcert.available_seats - 1,
      });

      const booking = manager.getRepository(Booking).create({
        user: { id: jwtUser.id } as User,
        concert: { id: dto.concert_id } as Concert,
        status: BookingStatus.ACTIVE,
      });
      const saved = await manager.getRepository(Booking).save(booking);

      await manager.getRepository(AuditLog).save(
        manager.getRepository(AuditLog).create({
          user: { id: jwtUser.id } as User,
          concert: { id: dto.concert_id } as Concert,
          booking: { id: saved.id } as Booking,
          action: AuditAction.BOOKING_CREATED,
          metadata: {
            available_seats_before: lockedConcert.available_seats,
            available_seats_after: lockedConcert.available_seats - 1,
          },
        }),
      );

      return saved;
    });
  }

  async cancel(bookingId: string, jwtUser: JwtUser) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user: { id: jwtUser.id } },
      relations: ['concert'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictException('Booking already cancelled');
    }

    return await this.dataSource.transaction(async (manager) => {

      const lockedConcert = await manager
        .getRepository(Concert)
        .createQueryBuilder('concert')
        .withDeleted()
        .setLock('pessimistic_write')
        .where('concert.id = :id', { id: booking.concert.id })
        .getOne();

      if (!lockedConcert) throw new NotFoundException('Concert not found');

      await manager.getRepository(Concert).update(booking.concert.id, {
        available_seats: lockedConcert.available_seats + 1,
      });

      booking.status = BookingStatus.CANCELLED;
      booking.cancelled_at = new Date();
      await manager.getRepository(Booking).save(booking);

      await manager.getRepository(AuditLog).save(
        manager.getRepository(AuditLog).create({
          user: { id: jwtUser.id } as User,
          concert: { id: booking.concert.id } as Concert,
          booking: { id: bookingId } as Booking,
          action: AuditAction.BOOKING_CANCELLED,
          metadata: {
            available_seats_before: lockedConcert.available_seats,
            available_seats_after: lockedConcert.available_seats + 1,
          },
        }),
      );

      return { message: 'Booking cancelled' };
    });
  }

  findMyBookings(jwtUser: JwtUser) {
    return this.bookingRepo.find({
      where: { user: { id: jwtUser.id } },
      relations: ['concert'],
      withDeleted: true,
      order: { booked_at: 'DESC' },
    });
  }

  findAll() {
    return this.bookingRepo.find({
      relations: ['concert'],
      withDeleted: true,
      order: { booked_at: 'DESC' },
    });
  }
}
