import { Status } from './enums';

export interface JobStatusDetails {
  step?: number;
  total?: number;
  exc_message?: string;
  exc_type?: string;
  input_file?: string | string[];
  output_file?: string | string[];
}

export namespace JobStatusDetails {
  export function fromDict(data: any): JobStatusDetails {
    return {
      step: data.step,
      total: data.total,
      exc_message: data.exc_message,
      exc_type: data.exc_type,
      input_file: data.in || data.In,
      output_file: data.out
    };
  }
}

export interface JobStatus {
  rid: string;
  status: Status;
  details?: JobStatusDetails;
  position_in_queue?: number;
}

export namespace JobStatus {
  export function fromDict(data: any): JobStatus {
    const details = data.details ? JobStatusDetails.fromDict(data.details) : undefined;
    return {
      rid: data.rid || '',
      status: data.status as Status,
      details,
      position_in_queue: data.position_in_queue || data.positionInQueue || 0
    };
  }
}
