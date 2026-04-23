import { Status } from './enums';

export interface Job {
  rid: string;
  status: Status;
  processor?: string;
  parameters?: Record<string, any>;
  variants?: Record<string, any>;
  charged_amount?: number;
  processing_info?: Record<string, any>;
  ctime?: number;
  mtime?: number;
}

export namespace Job {
  export function fromDict(data: any): Job {
    return {
      rid: data.rid || '',
      status: data.status as Status,
      processor: data.processor,
      parameters: data.parameters,
      variants: data.variants,
      charged_amount: data.chargedAmount,
      processing_info: data.processingInfo,
      ctime: data.ctime,
      mtime: data.mtime
    };
  }
}
