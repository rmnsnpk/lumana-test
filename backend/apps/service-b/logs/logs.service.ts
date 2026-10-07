import { BadRequestException, Injectable } from '@nestjs/common';

import { toCursorPage } from '#libs/common/index.js';
import { LOG_SORT_FIELD } from './consts/logs.consts.js';
import { LogDto } from './dto/log.dto.js';
import type { QueryLogsDto } from './dto/query-logs.dto.js';
import type { LogFilter } from './interfaces/log-filter.interface.js';
import type { LogPage } from './interfaces/log-page.interface.js';
import { LogsRepository } from './repositories/logs.repository.js';

@Injectable()
export class LogsService {
  constructor(private readonly logs: LogsRepository) {}

  async query(dto: QueryLogsDto): Promise<LogPage<LogDto>> {
    const filter = toFilter(dto);
    const [documents, total] = await Promise.all([
      this.logs.find(
        filter,
        { sortField: LOG_SORT_FIELD, direction: 'desc', cursor: dto.cursor },
        dto.limit,
      ),
      this.logs.count(filter),
    ]);
    const page = toCursorPage(documents, dto.limit, LOG_SORT_FIELD, LogDto.fromDocument);

    return {
      items: page.items,
      total,
      limit: dto.limit,
      hasMore: page.nextCursor !== null,
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
    };
  }
}

const toFilter = ({ type, action, from, to }: QueryLogsDto): LogFilter => {
  if (from && to && from > to) {
    throw new BadRequestException('from must not be after to');
  }

  return { type, action, from, to };
};
