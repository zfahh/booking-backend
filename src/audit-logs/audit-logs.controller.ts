import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(
    @Query('concert_id') concert_id?: string,
    @Query('user_id') user_id?: string,
    @Query('action') action?: AuditAction | AuditAction[],
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const actions = action
      ? Array.isArray(action)
        ? action
        : [action]
      : undefined;

    return this.auditLogsService.findAll({
      concert_id,
      user_id,
      actions,
      page,
      limit,
    });
  }

  @Get('concerts/:id')
  findByConcert(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.auditLogsService.findByConcert(id, page, limit);
  }
}
