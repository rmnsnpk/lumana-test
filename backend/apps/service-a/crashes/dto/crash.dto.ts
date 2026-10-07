import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { BOROUGHS } from '../consts/crash-values.consts.js';
import type { Borough, CrashDocument } from '../interfaces/crash-document.interface.js';
import type { CrashSearchPage } from '../interfaces/crash-search-page.interface.js';

export class CoordinatesDto {
  @ApiProperty()
  lat: number;

  @ApiProperty()
  lng: number;
}

export class CrashDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  collisionId: number;

  @ApiProperty()
  crashDate: string;

  @ApiPropertyOptional({ enum: BOROUGHS })
  borough?: Borough;

  @ApiPropertyOptional()
  zipCode?: string;

  @ApiPropertyOptional({ type: CoordinatesDto })
  coordinates?: CoordinatesDto;

  @ApiPropertyOptional()
  onStreetName?: string;

  @ApiPropertyOptional()
  offStreetName?: string;

  @ApiPropertyOptional()
  crossStreetName?: string;

  @ApiProperty()
  personsInjured: number;

  @ApiProperty()
  personsKilled: number;

  @ApiProperty()
  pedestriansInjured: number;

  @ApiProperty()
  pedestriansKilled: number;

  @ApiProperty()
  cyclistsInjured: number;

  @ApiProperty()
  cyclistsKilled: number;

  @ApiProperty()
  motoristsInjured: number;

  @ApiProperty()
  motoristsKilled: number;

  @ApiProperty({ type: [String] })
  contributingFactors: string[];

  @ApiProperty({ type: [String] })
  vehicleTypes: string[];

  static fromDocument(document: CrashDocument): CrashDto {
    const {
      _id,
      crashDate,
      location,
      searchPrefixes: _searchPrefixes,
      importedAt: _importedAt,
      ...rest
    } = document;

    return {
      ...rest,
      id: _id.toHexString(),
      crashDate: crashDate.toISOString(),
      ...(location
        ? { coordinates: { lat: location.coordinates[1], lng: location.coordinates[0] } }
        : {}),
    };
  }
}

export class CrashPageDto implements CrashSearchPage<CrashDto> {
  @ApiProperty({ type: [CrashDto] })
  items: CrashDto[];

  @ApiProperty({ description: `Number of matches, counted up to 20000` })
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Pass back unchanged as cursor to get the next page' })
  nextCursor?: string;
}
