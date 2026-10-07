import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import type { MongoClientOptions } from 'mongodb';

export interface MongoModuleOptions {
  uri: string;
  dbName: string;
  clientOptions?: MongoClientOptions;
}

export interface MongoModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: never[]) => MongoModuleOptions | Promise<MongoModuleOptions>;
  inject?: FactoryProvider['inject'];
}
