import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from '../common/enums/audit-action.enum';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async findAll(filters: {
    concert_id?: string;
    user_id?: string;
    actions?: AuditAction[];
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const query = this.auditLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.concert', 'concert')
      .leftJoinAndSelect('log.booking', 'booking')
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.concert_id) {
      query.andWhere('concert.id = :concert_id', {
        concert_id: filters.concert_id,
      });
    }
    if (filters.user_id) {
      query.andWhere('user.id = :user_id', { user_id: filters.user_id });
    }
    if (filters.actions?.length) {
      query.andWhere('log.action IN (:...actions)', {
        actions: filters.actions,
      });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findByConcert(concertId: string, page?: number, limit?: number) {
    return this.findAll({ concert_id: concertId, page, limit });
  }
}
