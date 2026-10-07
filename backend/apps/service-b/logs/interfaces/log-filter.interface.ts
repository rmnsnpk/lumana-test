import type { EventType } from '#libs/messaging/index.js';

export interface LogFilter {
  type?: EventType;
  action?: string;
  from?: Date;
  to?: Date;
}
