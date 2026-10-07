import { HttpException } from '@nestjs/common';

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof HttpException) {
    const response = error.getResponse();

    if (typeof response === 'string') return response;

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const { message } = response;
      if (Array.isArray(message)) return message.join('; ');
      if (typeof message === 'string') return message;
    }
  }

  return error instanceof Error ? error.message : String(error);
};
