import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { SocrataClient } from './clients/socrata.client.js';
import { createMulterOptions } from './config/multer-options.factory.js';
import { CrashesController } from './crashes.controller.js';
import { CrashesService } from './crashes.service.js';
import { CrashesRepository } from './repositories/crashes.repository.js';

@Module({
  imports: [
    MulterModule.registerAsync({ inject: [ConfigService], useFactory: createMulterOptions }),
  ],
  controllers: [CrashesController],
  providers: [CrashesService, SocrataClient, CrashesRepository],
})
export class CrashesModule {}
