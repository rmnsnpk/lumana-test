import { MongoError, MongoNetworkError, MongoServerSelectionError } from 'mongodb';

export const isTransientMongoError = (error: unknown): boolean =>
  error instanceof MongoNetworkError ||
  error instanceof MongoServerSelectionError ||
  (error instanceof MongoError && error.hasErrorLabel('RetryableWriteError'));
