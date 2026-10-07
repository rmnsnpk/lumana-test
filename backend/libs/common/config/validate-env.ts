import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

export const createEnvValidator =
  <T extends object>(envClass: ClassConstructor<T>) =>
  (raw: Record<string, unknown>): T => {
    const env = plainToInstance(envClass, raw, { enableImplicitConversion: true });
    const errors = validateSync(env, { skipMissingProperties: false, whitelist: false });

    if (errors.length > 0) {
      const details = errors
        .map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
        .join('\n  ');
      throw new Error(`Invalid environment configuration:\n  ${details}`);
    }

    return env;
  };
