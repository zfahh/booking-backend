import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Concert } from '../../concerts/entities/concert.entity';

export enum BookingStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Concert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concert_id' })
  concert: Concert;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.ACTIVE })
  status: BookingStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  booked_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date;
}
