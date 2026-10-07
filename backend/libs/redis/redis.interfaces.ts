import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import type { RedisClientType } from 'redis';

export type RedisClient = RedisClientType;

export interface RedisModuleOptions {
  url: string;
  clientName?: string;
}

export interface RedisModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: never[]) => RedisModuleOptions | Promise<RedisModuleOptions>;
  inject?: FactoryProvider['inject'];
}
