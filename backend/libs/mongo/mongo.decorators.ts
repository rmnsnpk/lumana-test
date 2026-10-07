import { Inject } from '@nestjs/common';

import { MONGO_CLIENT, MONGO_DB } from './mongo.constants.js';

export const InjectMongoClient = (): ParameterDecorator => Inject(MONGO_CLIENT);
export const InjectDb = (): ParameterDecorator => Inject(MONGO_DB);
