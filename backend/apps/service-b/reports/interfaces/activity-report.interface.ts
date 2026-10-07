export interface ActivityReportRequest {
  service: string;
  from?: Date;
  to?: Date;
}

export interface ActivityReport {
  pdf: Buffer;
  fileName: string;
}
