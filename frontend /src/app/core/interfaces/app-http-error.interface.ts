export interface AppHttpError {
  status: number;
  message: string;
  url: string | null;
}
