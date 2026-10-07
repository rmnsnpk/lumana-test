import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UPLOAD_FIELD_NAME } from './consts/upload.consts.js';
import { CrashesService } from './crashes.service.js';
import { CrashDto, CrashPageDto } from './dto/crash.dto.js';
import { FetchCrashesDto } from './dto/fetch-crashes.dto.js';
import { FetchResultDto } from './dto/fetch-result.dto.js';
import { ImportResultDto } from './dto/import-result.dto.js';
import { SearchCrashesDto } from './dto/search-crashes.dto.js';
import type { CrashSearchPage } from './interfaces/crash-search-page.interface.js';
import type { FetchResult } from './interfaces/fetch-result.interface.js';
import type { ImportResult } from './interfaces/import-result.interface.js';

@ApiTags('crashes')
@Controller('crashes')
export class CrashesController {
  constructor(private readonly crashes: CrashesService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Indexed prefix search over stored crashes, newest first, with cursor pagination',
  })
  @ApiOkResponse({ type: CrashPageDto })
  search(@Query() query: SearchCrashesDto): Promise<CrashSearchPage<CrashDto>> {
    return this.crashes.search(query);
  }

  @Post('fetch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Fetch NYC motor-vehicle collisions from the public API and save them as JSON or Excel',
  })
  @ApiCreatedResponse({ type: FetchResultDto })
  @ApiBadGatewayResponse({ description: 'The public API kept failing after retries' })
  fetch(@Body() body: FetchCrashesDto): Promise<FetchResult> {
    return this.crashes.fetchToFile(body);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor(UPLOAD_FIELD_NAME))
  @ApiOperation({ summary: 'Upload a JSON or Excel crashes file and save its rows to MongoDB' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [UPLOAD_FIELD_NAME],
      properties: { [UPLOAD_FIELD_NAME]: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: ImportResultDto })
  @ApiBadRequestResponse({ description: 'Missing, unsupported or unreadable file' })
  upload(@UploadedFile() file: Express.Multer.File | undefined): Promise<ImportResult> {
    return this.crashes.importFile(file);
  }
}
