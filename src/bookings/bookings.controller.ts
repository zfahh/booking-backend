import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.bookingsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @Request() req: RequestWithUser) {
    return this.bookingsService.create(dto, req.user);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookingsService.cancel(id, req.user);
  }

  @Get('me')
  findMyBookings(@Request() req: RequestWithUser) {
    return this.bookingsService.findMyBookings(req.user);
  }
}
