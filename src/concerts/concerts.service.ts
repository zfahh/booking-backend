import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concert } from './entities/concert.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';
import { AuditAction } from '../common/enums/audit-action.enum';

import { JwtUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class ConcertsService {
  constructor(
    @InjectRepository(Concert)
    private readonly concertRepo: Repository<Concert>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async create(dto: CreateConcertDto, user: JwtUser) {
    const concert = this.concertRepo.create({
      ...dto,
      available_seats: dto.total_seats,
      created_by: user,
    });
    const saved = await this.concertRepo.save(concert);

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        user,
        concert: saved,
        action: AuditAction.CONCERT_CREATED,
        metadata: { name: saved.name, total_seats: saved.total_seats },
      }),
    );

    return saved;
  }

  findAll() {
    return this.concertRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string) {
    const concert = await this.concertRepo.findOneBy({ id });
    if (!concert) throw new NotFoundException('Concert not found');
    return concert;
  }

  async update(id: string, dto: UpdateConcertDto, user: JwtUser) {
    const concert = await this.findOne(id);

    if (dto.total_seats !== undefined) {
      const activeBookings = await this.bookingRepo.count({
        where: { concert: { id }, status: BookingStatus.ACTIVE },
      });
      if (dto.total_seats < activeBookings) {
        throw new BadRequestException(
          `Cannot reduce tota seats below active bookings (${activeBookings})`,
        );
      }
      concert.available_seats = dto.total_seats - activeBookings;
    }

    Object.assign(concert, dto);

    const saved = await this.concertRepo.save(concert);

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        user,
        concert: saved,
        action: AuditAction.CONCERT_UPDATED,
        metadata: { changes: dto },
      }),
    );

    return saved;
  }

  async remove(id: string, user: JwtUser) {
    const concert = await this.findOne(id);

    const activeBookings = await this.bookingRepo.count({
      where: { concert: { id }, status: BookingStatus.ACTIVE },
    });
    if (activeBookings > 0) {
      throw new ConflictException('Concert has active bookings');
    }

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        user,
        concert,
        action: AuditAction.CONCERT_DELETED,
        metadata: { name: concert.name },
      }),
    );

    await this.concertRepo.softRemove(concert);
    return { message: 'Concert deleted' };
  }
}
