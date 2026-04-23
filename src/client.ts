import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import axios from 'axios';
import {
    Text2MotionParams,
    RenderParams,
    RerunParams,
    InpaintingParams,
    MergingParams,
    LoopParams,
    RefineParams,
    TimeInterval
} from './data/params';
import {CharacterModel} from './data/character';
import {Job} from './data/job';
import {JobStatus} from './data/job-status';
import {DownloadLink, UrlGroup} from './data/response';
import {Status} from './data/enums';
import {
    JobError,
    JobResult,
    ProgressCallback,
    ProgressCallbackData,
    ResultCallback,
    ResultCallbackData
} from './data/callback';
import {APIError, AuthenticationError, TimeoutError, ValidationError} from './exceptions';
import {
    file_exists,
    ensure_directory_exists,
    get_file_extension,
    get_file_name_without_ext,
    is_http_url
} from './utils';

function isAxiosError(error: any): boolean {
    return error && error.isAxiosError === true;
}

export class SaymotionClient {
    private api_server_url: string;
    private client_id: string;
    private client_secret: string;
    private timeout?: number;
    private _authenticated: boolean = false;
    private _cookies: Record<string, string> = {};
    private readonly _httpAgent = new http.Agent({keepAlive: true});
    private readonly _httpsAgent = new https.Agent({keepAlive: true});

    constructor(
        api_server_url: string,
        client_id: string,
        client_secret: string,
        timeout?: number
    ) {
        this.api_server_url = api_server_url.replace(/\/$/, '');
        this.client_id = client_id;
        this.client_secret = client_secret;
        this.timeout = timeout;
    }

    private _get_axios_config() {
        const config: any = {
            httpAgent: this._httpAgent,
            httpsAgent: this._httpsAgent,
        };
        if (this.timeout) {
            config.timeout = this.timeout * 1000;
        }
        return config;
    }

    private async _authenticate(): Promise<void> {
        const auth_url = `${this.api_server_url}/account/v1/auth`;
        const auth = Buffer.from(`${this.client_id}:${this.client_secret}`).toString('base64');

        try {
            const response: any = await axios.get(auth_url, {
                headers: {
                    'Authorization': `Basic ${auth}`
                },
                ...this._get_axios_config()
            });

            const setCookie = response.headers['set-cookie'];
            if (setCookie) {
                const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
                cookies.forEach(cookie => {
                    const [name, value] = cookie.trim().split('=');
                    if (name && value) {
                        this._cookies[name] = value;
                    }
                });

                if (this._cookies['dmsess']) {
                    this._authenticated = true;
                } else {
                    throw new AuthenticationError('Failed to get session cookie');
                }
            } else {
                throw new AuthenticationError('Failed to get session cookie');
            }
        } catch (error: any) {
            if (isAxiosError(error)) {
                if (error.response) {
                    throw new AuthenticationError(`Authentication failed: ${error.response.statusText}`);
                } else if (error.request) {
                    throw new AuthenticationError(`Authentication failed: No response received`);
                }
                throw new AuthenticationError(`Authentication failed: ${error.message}`);
            }
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(`Authentication failed: ${error.message}`);
        }
    }

    private async _request(
        method: string,
        path: string,
        params?: Record<string, any>,
        json_data?: Record<string, any>,
        data?: Buffer
    ): Promise<any> {
        if (!this._authenticated) {
            await this._authenticate();
        }

        const url = new URL(`${this.api_server_url}${path}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }

        const requestHeaders: Record<string, string> = {};

        const cookieString = Object.entries(this._cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
        if (cookieString) {
            requestHeaders['Cookie'] = cookieString;
        }

        try {
            let response: any;

            if (json_data) {
                requestHeaders['Content-Type'] = 'application/json';
                response = await axios({
                    method,
                    url: url.toString(),
                    headers: requestHeaders,
                    data: json_data,
                    ...this._get_axios_config()
                });
            } else if (data) {
                response = await axios({
                    method,
                    url: url.toString(),
                    headers: requestHeaders,
                    data: data,
                    ...this._get_axios_config()
                });
            } else {
                response = await axios({
                    method,
                    url: url.toString(),
                    headers: requestHeaders,
                    ...this._get_axios_config()
                });
            }

            return response.data;
        } catch (error: any) {
            if (isAxiosError(error)) {
                if (error.response) {
                    let error_msg = `API request failed with status ${error.response.status}`;
                    const respData = error.response.data;
                    if (respData && respData.message) {
                        error_msg = respData.message;
                    }
                    throw new APIError(error_msg, error.response.status);
                } else if (error.request) {
                    throw new APIError(`Request failed: No response received`);
                }
                throw new APIError(`Request failed: ${error.message}`);
            }
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(`Request failed: ${error.message}`);
        }
    }

    private async _process_job(processor: string, params_list: string[]): Promise<string> {
        const process_data = {params: params_list};
        const result = await this._request('POST', `/job/v1/process/${processor}`, undefined, process_data);
        return result.rid;
    }

    // ==================== Character Model API ====================

    async list_character_models(
        model_id?: string,
        search_token?: string,
        only_custom?: boolean
    ): Promise<CharacterModel[]> {
        const params: Record<string, any> = {};
        if (model_id) {
            params.modelId = model_id;
        }
        if (search_token) {
            params.searchToken = search_token;
        }
        if (!only_custom) {
            params.stockModel = 'all';
        }

        const data = await this._request('GET', '/character/v1/listModels', params);

        const characters: CharacterModel[] = [];
        if (Array.isArray(data)) {
            data.forEach((char_data: any) => {
                characters.push(CharacterModel.fromDict(char_data));
            });
        } else if (data.list) {
            data.list.forEach((char_data: any) => {
                characters.push(CharacterModel.fromDict(char_data));
            });
        }

        return characters;
    }

    async upload_character_model(
        source: string,
        name?: string,
        create_thumb: boolean = false
    ): Promise<string> {
        if (is_http_url(source)) {
            return await this._store_model(
                source,
                name || 'Unnamed Model',
                create_thumb
            );
        } else {
            if (!file_exists(source)) {
                throw new ValidationError(`Model file does not exist: ${source}`);
            }

            if (!name) {
                name = get_file_name_without_ext(source);
            }

            const model_ext = get_file_extension(source);
            const file_data = fs.readFileSync(source);
            const fileSize = file_data.length;

            const upload_params = {
                name,
                modelExt: model_ext,
                resumable: '0',
                fileSize
            };

            const {modelUrl} = await this._request('GET', '/character/v1/getModelUploadUrl', upload_params);

            const headers = {
                'Content-Length': fileSize,
                'Content-Type': 'application/octet-stream'
            };

            try {
                await axios.put(modelUrl, file_data, {
                    headers,
                    ...this._get_axios_config()
                });
            } catch (error: any) {
                if (isAxiosError(error)) {
                    throw new APIError(`Upload failed: ${error.message}`);
                }
                throw new APIError(`Upload failed: ${error.message}`);
            }

            return await this._store_model(
                modelUrl,
                name,
                create_thumb
            );
        }
    }

    private async _store_model(
        model_url: string,
        model_name: string,
        create_thumb: boolean = false,
        thumb_url?: string,
        model_id?: string
    ): Promise<string> {
        const store_data: Record<string, any> = {
            modelUrl: model_url,
            modelName: model_name
        };

        if (thumb_url) {
            store_data.thumbUrl = thumb_url;
        }
        if (model_id) {
            store_data.modelId = model_id;
        }
        if (create_thumb) {
            store_data.createThumb = 1;
        }

        const result = await this._request('POST', '/character/v1/storeModel', undefined, store_data);
        return result.modelId;
    }

    async delete_character_model(model_id: string): Promise<number> {
        const data = await this._request('DELETE', `/character/v1/deleteModel/${model_id}`);
        return data.count || 0;
    }

    // ==================== Job API ====================

    private async _start_and_poll(
        processor: string,
        params_list: string[],
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        const rid = await this._process_job(processor, params_list);

        if (blocking || progress_callback || result_callback) {
            if (blocking) {
                await this._poll_job(
                    rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                );
            } else {
                this._poll_job(
                    rid,
                    result_callback,
                    progress_callback,
                    poll_interval,
                    timeout
                ).catch(console.error);
            }
        }

        return rid;
    }

    async start_new_job(
        prompt: string,
        model_id: string,
        params?: Text2MotionParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        if (!params) {
            params = new Text2MotionParams();
        }

        return await this._start_and_poll(
            'text2motion',
            params.toParamsList(prompt, model_id),
            result_callback,
            progress_callback,
            poll_interval,
            blocking,
            timeout
        );
    }

    async start_render_job(
        t2m_rid: string,
        params?: RenderParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        if (!params) {
            params = new RenderParams();
        }

        return await this._start_and_poll(
            'render',
            params.toParamsList(t2m_rid),
            result_callback,
            progress_callback,
            poll_interval,
            blocking,
            timeout
        );
    }

    async rerun_job(
        t2m_rid: string,
        model_id: string,
        params?: RerunParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        if (!params) {
            params = new RerunParams();
        }

        return await this._start_and_poll(
            'text2motion',
            params.toParamsList(t2m_rid, model_id),
            result_callback,
            progress_callback,
            poll_interval,
            blocking,
            timeout
        );
    }

    async start_inpainting_job(
        t2m_rid: string,
        prompt: string,
        intervals: TimeInterval[],
        params?: InpaintingParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        if (!params) {
            params = new InpaintingParams();
        }

        return await this._start_and_poll(
            'text2motion',
            params.toParamsList(t2m_rid, prompt, intervals),
            result_callback,
            progress_callback,
            poll_interval,
            blocking,
            timeout
        );
    }

    async start_merging_job(
        t2m_rid: string,
        prompt: string,
        params?: MergingParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        if (!params) {
            params = new MergingParams();
        }

        return await this._start_and_poll(
            'text2motion',
            params.toParamsList(t2m_rid, prompt),
            result_callback,
            progress_callback,
            poll_interval,
            blocking,
            timeout
        );
    }

    async start_loop_job(
        t2m_rid: string,
        params?: LoopParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        if (!params) {
            params = new LoopParams();
        }

        return await this._start_and_poll(
            'text2motion',
            params.toParamsList(t2m_rid),
            result_callback,
            progress_callback,
            poll_interval,
            blocking,
            timeout
        );
    }

    async start_refine_job(
        t2m_rid: string,
        params?: RefineParams,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        blocking: boolean = true,
        timeout?: number
    ): Promise<string> {
        if (!params) {
            params = new RefineParams();
        }

        return await this._start_and_poll(
            'text2motion',
            params.toParamsList(t2m_rid),
            result_callback,
            progress_callback,
            poll_interval,
            blocking,
            timeout
        );
    }

    async import_animate3d_job(rid: string, model: string, params: string[]): Promise<string> {
        const body = {model, params};
        const result = await this._request('POST', `/job/v1/import/animate3d/${rid}`, undefined, body);
        return result.rid;
    }

    async cancel_job(rid: string): Promise<boolean> {
        const data = await this._request('GET', `/job/v1/cancel/${rid}`);
        return data.result || false;
    }

    private async _poll_job(
        rid: string,
        result_callback?: ResultCallback,
        progress_callback?: ProgressCallback,
        poll_interval: number = 5,
        timeout?: number
    ): Promise<void> {
        const start_time = Date.now();

        while (true) {
            const job_status = await this.get_job_status(rid);

            if (job_status.status === Status.PROGRESS) {
                const step = job_status.details?.step || 0;
                const total = job_status.details?.total || 100;
                const percent = Math.ceil((step / total) * 100) || 0;
                const queue_pos = job_status.position_in_queue || 0;

                if (progress_callback) {
                    const data: ProgressCallbackData = {
                        rid,
                        progress_percent: percent,
                        position_in_queue: queue_pos
                    };
                    const result = progress_callback(data);
                    if (result instanceof Promise) {
                        await result;
                    }
                } else {
                    if (queue_pos) {
                        console.log(`Position in queue: ${queue_pos}`);
                    } else {
                        console.log(`Progress: ${percent}%`);
                    }
                }
            }

            if (job_status.status === Status.SUCCESS || job_status.status === Status.FAILURE) {
                if (!result_callback) {
                    if (job_status.status === Status.SUCCESS) {
                        console.log('Job completed successfully!');
                    } else {
                        console.log(`Job failed: ${job_status.details?.exc_message}`);
                    }
                } else {
                    let result_data: JobResult | undefined = undefined;
                    let error_data: JobError | undefined = undefined;

                    if (job_status.status === Status.SUCCESS) {
                        const inp = job_status.details?.input_file ? [job_status.details.input_file as string] : [];
                        const out = job_status.details?.output_file;
                        result_data = {input: inp, output: out};
                    } else {
                        const code = job_status.details?.exc_type || 'Unknown';
                        const msg = job_status.details?.exc_message || 'Unknown error';
                        error_data = {code, message: msg};
                    }

                    const data: ResultCallbackData = {
                        rid,
                        result: result_data,
                        error: error_data
                    };
                    const result = result_callback(data);
                    if (result instanceof Promise) {
                        await result;
                    }
                }
                return;
            }

            if (timeout && (Date.now() - start_time) / 1000 > timeout) {
                throw new TimeoutError(`Job timed out after ${timeout} seconds`, rid);
            }

            await new Promise(resolve => setTimeout(resolve, poll_interval * 1000));
        }
    }

    async get_job_status(rid: string): Promise<JobStatus> {
        const data = await this._request('GET', `/job/v1/status/${rid}`);

        if (data.count > 0 && data.status) {
            const status_data = data.status[0];
            return JobStatus.fromDict(status_data);
        }

        return {
            rid,
            status: Status.PROGRESS
        };
    }

    async list_jobs(status?: Status[], processor?: string): Promise<Job[]> {
        let path: string;
        if (status && processor) {
            const status_str = status.join(',');
            path = `/job/v1/list/${status_str}/${processor}`;
        } else if (status) {
            const status_str = status.join(',');
            path = `/job/v1/list/${status_str}`;
        } else if (processor) {
            path = `/job/v1/list/SUCCESS,PROGRESS,FAILURE/${processor}`;
        } else {
            path = '/job/v1/list';
        }

        const data = await this._request('GET', path);

        const jobs: Job[] = [];
        if (data.list) {
            data.list.forEach((job_data: any) => {
                jobs.push(Job.fromDict(job_data));
            });
        }

        return jobs;
    }

    async download_job(rid: string, output_dir?: string, variant_id?: number): Promise<DownloadLink> {
        const params: Record<string, any> = {};
        if (variant_id !== undefined) {
            params.variant_id = variant_id;
        }

        const data = await this._request('GET', `/job/v1/download/${rid}`, Object.keys(params).length ? params : undefined);

        if (data.count === 0) {
            throw new APIError(`No download links found for rid ${rid}`);
        }

        const link_data = data.links[0];
        const download_link = DownloadLink.fromDict(link_data);

        if (output_dir) {
            await this._download_files(download_link, output_dir);
        }

        return download_link;
    }

    private async _download_files(download_link: DownloadLink, output_dir: string): Promise<number> {
        const output_dir_with_rid = path.join(output_dir, download_link.rid);
        ensure_directory_exists(output_dir_with_rid);

        let count = 0;
        for (const url_group of download_link.urls) {
            const name = url_group.name;

            if (name.startsWith('inter')) {
                continue;
            }

            for (const file_info of url_group.files) {
                const file_type = file_info.file_type;
                const file_url = file_info.url;

                const output_file = path.join(output_dir_with_rid, `${name}.${file_type}`);

                try {
                    const response: any = await axios.get(file_url, {
                        responseType: 'arraybuffer',
                        validateStatus: (status: number) => status < 500,
                        ...this._get_axios_config()
                    });

                    if (response.status >= 400) {
                        throw new APIError(`Download failed with status ${response.status}`);
                    }

                    fs.writeFileSync(output_file, Buffer.from(response.data));
                    count++;
                } catch (error: any) {
                    if (isAxiosError(error)) {
                        throw new APIError(`Download failed: ${error.message}`);
                    }
                    throw new APIError(`Download failed: ${error.message}`);
                }
            }
        }

        console.log(`Downloaded ${count} files to ${output_dir_with_rid}`);
        return count;
    }

    // ==================== Prompt API ====================

    async optimize_prompt(
        prompt: string,
        break_into_actionable_prompts?: number
    ): Promise<string> {
        const params_list = [`prompt="${prompt}"`];
        if (break_into_actionable_prompts !== undefined) {
            params_list.push(`breakIntoActionablePrompts=${break_into_actionable_prompts}`);
        }

        const body = {params: params_list};
        const result = await this._request('POST', '/prompt/v1/optimize', undefined, body);
        return result.rid;
    }

    async get_prompt_status(rid: string): Promise<Record<string, any>> {
        return await this._request('GET', `/prompt/v1/status/${rid}`);
    }

    // ==================== Account API ====================

    async get_credit_balance(): Promise<number> {
        const data = await this._request('GET', '/account/v1/creditBalance');
        return Math.floor(data.credits || 0);
    }

    async close(): Promise<void> {
        this._httpAgent.destroy();
        this._httpsAgent.destroy();
    }
}
