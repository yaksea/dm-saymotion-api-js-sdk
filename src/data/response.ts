export interface FileInfo {
  file_type: string;
  url: string;
}

export interface UrlGroup {
  name: string;
  files: FileInfo[];
}

export namespace UrlGroup {
  export function fromDict(data: any): UrlGroup {
    return {
      name: data.name || '',
      files: (data.files || []).map((file: any) => {
        const file_type = Object.keys(file)[0];
        const url = file[file_type];
        return { file_type, url };
      })
    };
  }
}

export interface DownloadLink {
  rid: string;
  name?: string;
  size?: number;
  duration?: number;
  input_url?: string;
  mode?: number;
  models?: any[];
  urls: UrlGroup[];
  parameters?: Record<string, any>;
  render_job_list?: any;
  variant_download_status?: boolean;
}

export namespace DownloadLink {
  export function fromDict(data: any): DownloadLink {
    return {
      rid: data.rid || '',
      name: data.name,
      size: data.size,
      duration: data.duration,
      input_url: data.input,
      mode: data.mode,
      models: data.models,
      urls: (data.urls || []).map((group: any) => UrlGroup.fromDict(group)),
      parameters: data.parameters,
      render_job_list: data.renderJobList,
      variant_download_status: data.variantDownloadStatus
    };
  }
}
