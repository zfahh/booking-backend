import { IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  concert_id: string;
}
