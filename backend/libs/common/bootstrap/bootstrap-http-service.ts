import { Logger, Type, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AllExceptionsFilter } from '../filters/all-exceptions.filter.js';
import { SWAGGER_PATH } from './bootstrap.constants.js';

export interface HttpServiceOptions {
  module: Type<unknown>;
  name: string;
  description: string;
  version?: string;
  configure?: (app: NestExpressApplication) => void | Promise<void>;
}

export const bootstrapHttpService = async ({
  module,
  name,
  description,
  version = '1.0.0',
  configure,
}: HttpServiceOptions): Promise<NestExpressApplication> => {
  const app = await NestFactory.create<NestExpressApplication>(module, { bufferLogs: false });
  const logger = new Logger(name);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle(name)
    .setDescription(description)
    .setVersion(version)
    .build();
  SwaggerModule.setup(SWAGGER_PATH, app, () => SwaggerModule.createDocument(app, swaggerConfig));

  await configure?.(app);

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);
  logger.log(`Listening on :${port}, docs at /${SWAGGER_PATH}`);

  return app;
};
