import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateConcertDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  total_seats: number;
}
