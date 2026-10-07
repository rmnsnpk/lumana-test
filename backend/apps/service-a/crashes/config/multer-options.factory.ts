import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { MulterModuleOptions } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import type { ServiceAEnv } from '../../config/service-a.env.js';
import { UPLOAD_FORMATS, UPLOADS_SUBDIR } from '../consts/upload.consts.js';

export const createMulterOptions = (
  config: ConfigService<ServiceAEnv, true>,
): MulterModuleOptions => {
  const destination = join(resolve(config.get('DATA_DIR', { infer: true })), UPLOADS_SUBDIR);
  mkdirSync(destination, { recursive: true });

  return {
    storage: diskStorage({
      destination,
      filename: (_request, file, callback) =>
        callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: config.get('UPLOAD_MAX_BYTES', { infer: true }), files: 1 },
    fileFilter: (_request, file, callback) => {
      if (UPLOAD_FORMATS[extname(file.originalname).toLowerCase()]) {
        callback(null, true);
        return;
      }
      callback(new BadRequestException('Only .json and .xlsx files are supported'), false);
    },
  };
};
