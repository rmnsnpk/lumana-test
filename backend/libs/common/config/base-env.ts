import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

import { NODE_ENVIRONMENTS } from './config.constants.js';
import type { NodeEnvironment } from './config.constants.js';

export class BaseEnv {
  @IsIn(NODE_ENVIRONMENTS)
  NODE_ENV: NodeEnvironment = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  MONGO_URI: string;

  @IsString()
  @IsNotEmpty()
  MONGO_DB: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;
}
