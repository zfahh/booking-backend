import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConcertsService } from './concerts.service';
import { ConcertsController } from './concerts.controller';
import { Concert } from './entities/concert.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Concert, Booking, AuditLog])],
  controllers: [ConcertsController],
  providers: [ConcertsService],
})
export class ConcertsModule {}
