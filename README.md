# SayMotion JavaScript/TypeScript SDK

JavaScript/TypeScript SDK for the SayMotion REST API. All methods are asynchronous and return Promises.

## Installation

```bash
npm install dm-saymotion-api
```

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in your project root:

```bash
DM_SAYMOTION_API_SERVER_URL=https://api-saymotion.deepmotion.com:443
DM_SAYMOTION_CLIENT_ID=your_client_id
DM_SAYMOTION_CLIENT_SECRET=your_client_secret
```

Or set environment variables directly:

```bash
export DM_SAYMOTION_CLIENT_ID=your_client_id
export DM_SAYMOTION_CLIENT_SECRET=your_client_secret
```

### 2. Basic Usage

```javascript
require('dotenv').config();

const { SaymotionClient, Text2MotionParams } = require('dm-saymotion-api');

async function main() {
  try {
    const client = new SaymotionClient(
      process.env.DM_SAYMOTION_API_SERVER_URL || 'https://api-saymotion.deepmotion.com:443',
      process.env.DM_SAYMOTION_CLIENT_ID,
      process.env.DM_SAYMOTION_CLIENT_SECRET
    );

    const balance = await client.get_credit_balance();
    console.log(`Credit balance: ${balance}`);

    const all_models = await client.list_character_models();
    const model_id = all_models[0]?.id;

    if (!model_id) {
      console.error('No character models available');
      return;
    }

    function onProgress(data) {
      if (data.position_in_queue) {
        console.log(`Position in queue: ${data.position_in_queue}`);
      } else {
        console.log(`Progress: ${data.progress_percent}%`);
      }
    }

    async function onResult(data) {
      if (data.result) {
        console.log('Job completed successfully!');
        await client.download_job(data.rid, './output');
      } else if (data.error) {
        console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
      }
    }

    const params = new Text2MotionParams({
      requested_animation_duration: 5.0
    });

    console.log('Starting job...');
    const rid = await client.start_new_job(
      'A person walking forward slowly',
      model_id,
      params,
      onResult,
      onProgress
    );
    console.log(`Job finished, RID: ${rid}`);

    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### TypeScript Usage

```typescript
import 'dotenv/config';
import { SaymotionClient, Text2MotionParams } from 'dm-saymotion-api';

async function main(): Promise<void> {
  try {
    const client = new SaymotionClient(
      process.env.DM_SAYMOTION_API_SERVER_URL || 'https://api-saymotion.deepmotion.com:443',
      process.env.DM_SAYMOTION_CLIENT_ID!,
      process.env.DM_SAYMOTION_CLIENT_SECRET!
    );

    const balance: number = await client.get_credit_balance();
    console.log(`Credit balance: ${balance}`);

    const all_models = await client.list_character_models();
    const model_id = all_models[0]?.id;

    if (!model_id) {
      console.error('No character models available');
      return;
    }

    const onProgress = (data: { rid: string; progress_percent: number; position_in_queue: number }): void => {
      if (data.position_in_queue) {
        console.log(`Position in queue: ${data.position_in_queue}`);
      } else {
        console.log(`Progress: ${data.progress_percent}%`);
      }
    };

    const onResult = async (data: { rid: string; result?: { input: string[]; output: any }; error?: { code: string; message: string } }): Promise<void> => {
      if (data.result) {
        console.log('Job completed successfully!');
        await client.download_job(data.rid, './output');
      } else if (data.error) {
        console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
      }
    };

    const params = new Text2MotionParams({
      requested_animation_duration: 5.0
    });

    console.log('Starting job...');
    const rid: string = await client.start_new_job(
      'A person walking forward slowly',
      model_id,
      params,
      onResult,
      onProgress
    );
    console.log(`Job finished, RID: ${rid}`);

    await client.close();
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

main();
```

## Usage Examples

See the `js_examples/` and `ts_examples/` directories for complete usage examples:

- `basic_usage` - Basic text2motion usage
- `batch_usage` - Submit multiple jobs without blocking
- `render_job_usage` - Render animation to video
- `character_model_usage` - Character model management
- `rerun_job_usage` - Rerunning jobs with different parameters

## API Reference

### Client Initialization

```javascript
const client = new SaymotionClient(
  api_server_url,      // API server URL
  client_id,           // Client ID
  client_secret,       // Client secret
  timeout              // Request timeout in seconds (optional, default: none)
);
```

### Character Model API

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `list_character_models` | model_id?, search_token?, only_custom? | Promise<CharacterModel[]> | List available models |
| `upload_character_model` | source, name?, create_thumb? | Promise<string> (model_id) | Upload or store a model |
| `delete_character_model` | model_id | Promise<number> (count) | Delete a model |

### Job API

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `start_new_job` | prompt, model_id, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Start text2motion job |
| `start_render_job` | t2m_rid, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Render animation to video |
| `start_inpainting_job` | t2m_rid, prompt, intervals, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Inpainting job |
| `start_merging_job` | t2m_rid, prompt, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Merging job |
| `start_loop_job` | t2m_rid, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Loop job |
| `start_refine_job` | t2m_rid, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (rid) | Refine job |
| `rerun_job` | t2m_rid, model_id, params?, result_callback?, progress_callback?, poll_interval?, blocking?, timeout? | Promise<string> (new_rid) | Rerun with different params |
| `import_animate3d_job` | rid, model, params | Promise<string> (rid) | Import Animate3D job |
| `cancel_job` | rid | Promise<boolean> | Cancel job |
| `get_job_status` | rid | Promise<JobStatus> | Get current job status |
| `list_jobs` | status?, processor? | Promise<Job[]> | List jobs |
| `download_job` | rid, output_dir?, variant_id? | Promise<DownloadLink> | Download job results |

### Prompt API

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `optimize_prompt` | prompt, break_into_actionable_prompts? | Promise<string> (rid) | Optimize prompt |
| `get_prompt_status` | rid | Promise<Record<string, any>> | Get prompt optimization status |

### Account API

| Method | Returns | Description |
|--------|---------|-------------|
| `get_credit_balance` | Promise<number> | Get account credit balance |

## Parameter Classes

### Text2MotionParams

```javascript
const params = new Text2MotionParams({
  physics_filter: false,              // false to turn off simulation
  foot_locking_mode: 'auto',          // "auto", "always", "never", "grounding"
  pose_filtering_strength: 0.0,       // 0.0-1.0
  skip_fbx: 0,                        // 1 to skip FBX generation
  num_variant: 1,                     // 1-8 variants
  requested_animation_duration: 5.0,  // seconds (0 means AI decides)
});
```

### RenderParams

```javascript
const params = new RenderParams({
  variant_id: 1,
  bg_color: [0, 177, 64, 0],         // RGBA for green screen
  backdrop: 'studio',                // "studio" or 2D backdrop name
  shadow: 1,                         // 0=off, 1=on
  cam_mode: 0,                       // 0=Cinematic, 1=Fixed, 2=Face
  cam_horizontal_angle: 0.0,         // -90 to +90 degrees
});
```

### RerunParams

Inherits all `Text2MotionParams` optional settings.

```javascript
const params = new RerunParams({
  variant_id: 1,
  rerun: 1,
  physics_filter: false,
  foot_locking_mode: 'auto',
  pose_filtering_strength: 0.0,
  skip_fbx: 0,
  num_variant: 1,
  requested_animation_duration: null,
});
```

### TimeInterval

```javascript
const interval = new TimeInterval(0.5, 2.0);
```

### InpaintingParams

```javascript
const params = new InpaintingParams({
  variant_id: 1,
});
```

### MergingParams

```javascript
const params = new MergingParams({
  variant_id: 1,
  edit_request: { numTrimLeft: 5, numTrimRight: 5 },
  blend_duration: 0.5,
});
```

### LoopParams

```javascript
const params = new LoopParams({
  variant_id: 1,
  prompt: 'looping motion',
  num_reps: 3,
  blend_duration: 0.5,
  fix_root_mode: 'INTERPOLATION',      // "INTERPOLATION" or "LOCKED"
  fix_root_position_altitude: 0,       // 0 or 1
  fix_root_position_horizontal: 0,     // 0 or 1
  fix_root_orientation: 0,             // 0 or 1
  fix_across_entire_motion: 0,         // 0 or 1
});
```

### RefineParams

```javascript
const params = new RefineParams({
  variant_id: 1,
  prompt: 'refined motion description',
  creativity: 0.5,                     // 0.0-1.0
  num_variant: 1,                      // 1-8 variants
});
```

## Error Handling

```javascript
const { SaymotionError, AuthenticationError, APIError, ValidationError, TimeoutError } = require('dm-saymotion-api');

try {
  // SDK operations
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof APIError) {
    console.error('API error:', error.message, 'Status code:', error.status_code);
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof TimeoutError) {
    console.error('Operation timed out:', error.message);
  } else if (error instanceof SaymotionError) {
    console.error('SayMotion SDK error:', error.message);
  } else {
    console.error('General error:', error.message);
  }
}

// Job errors are returned in the result callback via ResultCallbackData.error
function onResult(data) {
  if (data.error) {
    console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DM_SAYMOTION_API_SERVER_URL` | No | `https://api-saymotion.deepmotion.com:443` | API server URL |
| `DM_SAYMOTION_CLIENT_ID` | Yes | - | Client ID |
| `DM_SAYMOTION_CLIENT_SECRET` | Yes | - | Client secret |
| `HTTP_PROXY` | No | - | HTTP proxy URL |
| `HTTPS_PROXY` | No | - | HTTPS proxy URL |

## Requirements

- Node.js 14.0+
- dotenv (for environment variable loading)
- axios (HTTP client with proxy support)

## License

MIT License

## Support

For issues and questions, please contact DeepMotion support.
