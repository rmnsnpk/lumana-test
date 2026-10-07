import type { ObjectId } from 'mongodb';

import type { BOROUGHS } from '../consts/crash-values.consts.js';

export type Borough = (typeof BOROUGHS)[number];

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface CrashRecord {
  collisionId: number;
  crashDate: Date;
  borough?: Borough;
  zipCode?: string;
  location?: GeoPoint;
  onStreetName?: string;
  offStreetName?: string;
  crossStreetName?: string;
  personsInjured: number;
  personsKilled: number;
  pedestriansInjured: number;
  pedestriansKilled: number;
  cyclistsInjured: number;
  cyclistsKilled: number;
  motoristsInjured: number;
  motoristsKilled: number;
  contributingFactors: string[];
  vehicleTypes: string[];
  searchPrefixes: string[];
}

export interface CrashDocument extends CrashRecord {
  _id: ObjectId;
  importedAt: Date;
}
