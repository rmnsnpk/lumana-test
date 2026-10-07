import { resolve } from 'node:path';

import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { credentials, loadPackageDefinition, status } from '@grpc/grpc-js';
import type { Client, ServiceClientConstructor, ServiceError } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';

import type { ServiceBEnv } from '../../config/service-b.env.js';
import { REPORT_MAX_MESSAGE_BYTES, REPORT_PACKAGE_PATH } from '../consts/reports.consts.js';
import type {
  ActivityReport,
  ActivityReportRequest,
} from '../interfaces/activity-report.interface.js';

interface Timestamp {
  seconds: number;
  nanos: number;
}

interface GenerateRequest {
  service: string;
  from?: Timestamp;
  to?: Timestamp;
}

interface GenerateResponse {
  pdf?: Buffer;
  fileName?: string;
}

interface ReportServiceClient extends Client {
  GenerateActivityReport(
    request: GenerateRequest,
    options: { deadline: Date },
    callback: (error: ServiceError | null, response?: GenerateResponse) => void,
  ): void;
}

@Injectable()
export class ReportGrpcClient implements OnModuleDestroy {
  private readonly logger = new Logger(ReportGrpcClient.name);
  private readonly client: ReportServiceClient;
  private readonly timeoutMs: number;

  constructor(config: ConfigService<ServiceBEnv, true>) {
    this.timeoutMs = config.get('REPORT_GRPC_TIMEOUT_MS', { infer: true });
    this.client = createClient(
      resolve(config.get('REPORT_PROTO_PATH', { infer: true })),
      config.get('REPORT_GRPC_URL', { infer: true }),
    );
  }

  generateActivityReport({ service, from, to }: ActivityReportRequest): Promise<ActivityReport> {
    const request: GenerateRequest = {
      service,
      ...(from ? { from: toTimestamp(from) } : {}),
      ...(to ? { to: toTimestamp(to) } : {}),
    };

    return new Promise((resolvePromise, reject) => {
      this.client.GenerateActivityReport(
        request,
        { deadline: new Date(Date.now() + this.timeoutMs) },
        (error, response) => {
          if (error) {
            this.logger.warn(
              `GenerateActivityReport failed (${status[error.code]}): ${error.details}`,
            );
            return reject(toHttpException(error));
          }
          if (!response?.pdf?.length) {
            return reject(new BadGatewayException('Report service returned an empty PDF'));
          }
          return resolvePromise({
            pdf: Buffer.from(response.pdf),
            fileName: response.fileName || `activity-${service}.pdf`,
          });
        },
      );
    });
  }

  onModuleDestroy(): void {
    this.client.close();
  }
}

const createClient = (protoPath: string, address: string): ReportServiceClient => {
  const definition = loadSync(protoPath, {
    keepCase: false,
    longs: Number,
    enums: String,
    defaults: false,
    oneofs: true,
  });
  let node: unknown = loadPackageDefinition(definition);

  for (const segment of REPORT_PACKAGE_PATH) {
    node = (node as Record<string, unknown> | undefined)?.[segment];
  }

  if (typeof node !== 'function') {
    throw new Error(`ReportService is not defined in ${protoPath}`);
  }

  const ServiceClient = node as ServiceClientConstructor;

  return new ServiceClient(address, credentials.createInsecure(), {
    'grpc.max_receive_message_length': REPORT_MAX_MESSAGE_BYTES,
  }) as unknown as ReportServiceClient;
};

const toTimestamp = (date: Date): Timestamp => {
  const milliseconds = date.getTime();
  const seconds = Math.floor(milliseconds / 1000);

  return { seconds, nanos: (milliseconds - seconds * 1000) * 1_000_000 };
};

const toHttpException = (error: ServiceError): HttpException => {
  switch (error.code) {
    case status.INVALID_ARGUMENT:
      return new BadRequestException(error.details);
    case status.DEADLINE_EXCEEDED:
      return new GatewayTimeoutException('Report service did not answer in time');
    case status.UNAVAILABLE:
      return new ServiceUnavailableException('Report service is unavailable');
    default:
      return new BadGatewayException('Report service failed');
  }
};
