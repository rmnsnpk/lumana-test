import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { Db } from 'mongodb';

import { InjectDb } from '../mongo/index.js';
import { InjectRedis } from '../redis/index.js';
import type { RedisClient } from '../redis/index.js';
import { SkipTracking } from '../telemetry/index.js';

type DependencyStatus = 'up' | 'down';

interface HealthReport {
  status: 'ok' | 'error';
  mongo: DependencyStatus;
  redis: DependencyStatus;
}

@ApiTags('health')
@SkipTracking()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDb() private readonly db: Db,
    @InjectRedis() private readonly redis: RedisClient,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'All dependencies are reachable' })
  @ApiServiceUnavailableResponse({ description: 'At least one dependency is down' })
  async check(): Promise<HealthReport> {
    const [mongo, redis] = await Promise.all([
      probe(() => this.db.command({ ping: 1 })),
      probe(() => this.redis.ping()),
    ]);
    const report: HealthReport = {
      status: mongo === 'up' && redis === 'up' ? 'ok' : 'error',
      mongo,
      redis,
    };

    if (report.status === 'error') {
      throw new ServiceUnavailableException(report);
    }

    return report;
  }
}

const probe = async (check: () => Promise<unknown>): Promise<DependencyStatus> => {
  try {
    await check();
    return 'up';
  } catch {
    return 'down';
  }
};
