import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { Concert } from '../concerts/entities/concert.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Concert, AuditLog])],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
