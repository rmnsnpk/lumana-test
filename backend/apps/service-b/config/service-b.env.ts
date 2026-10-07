import { Type } from 'class-transformer';
import { IsInt, IsString, Max, Min } from 'class-validator';

import { BaseEnv } from '#libs/common/index.js';

export class ServiceBEnv extends BaseEnv {
  @IsString()
  REPORT_GRPC_URL = 'localhost:50051';

  @IsString()
  REPORT_PROTO_PATH = 'proto/report/v1/report.proto';

  @Type(() => Number)
  @IsInt()
  @Min(1_000)
  @Max(300_000)
  REPORT_GRPC_TIMEOUT_MS = 30_000;
}
