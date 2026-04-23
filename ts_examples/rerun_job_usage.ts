import 'dotenv/config';
import { SaymotionClient, Status, RerunParams } from '../src';

function onProgress(data: { rid: string; progress_percent: number; position_in_queue: number }): void {
  if (data.position_in_queue) {
    console.log(`Position in queue: ${data.position_in_queue}`);
  } else {
    console.log(`Progress: ${data.progress_percent}%`);
  }
}

async function onResult(data: { rid: string; result?: { input: string[]; output: any }; error?: { code: string; message: string } }): Promise<void> {
  if (data.result) {
    console.log('Job completed successfully!');
    if (data.result.output) {
      console.log(`Output: ${JSON.stringify(data.result.output)}`);
    }
  } else if (data.error) {
    console.error(`Job failed: ${data.error.message} (Code: ${data.error.code})`);
  }
}

async function main(): Promise<void> {
  const client = new SaymotionClient(
    process.env.DM_SAYMOTION_API_SERVER_URL || 'https://api-saymotion.deepmotion.com:443',
    process.env.DM_SAYMOTION_CLIENT_ID!,
    process.env.DM_SAYMOTION_CLIENT_SECRET!
  );

  // List completed text2motion jobs
  const jobs = await client.list_jobs(
    [Status.SUCCESS],
    'text2motion'
  );
  if (!jobs.length) {
    console.log('No completed jobs to rerun');
    return;
  }

  // Use the first completed job
  const rid = jobs[0].rid;
  let variantId = 1;
  if (jobs[0].variants && typeof jobs[0].variants === 'object') {
    const firstKey = Object.keys(jobs[0].variants)[0] || '1';
    variantId = parseInt(firstKey, 10) || 1;
  }

  console.log(`Rerunning job RID: ${rid}, variant_id: ${variantId}`);

  // Get a character model ID
  const allModels = await client.list_character_models();
  if (!allModels.length) {
    console.log('No models found');
    return;
  }
  const modelId = allModels[0].id;

  try {
    const newRid = await client.rerun_job(
      rid,
      modelId,
      new RerunParams({ variant_id: variantId }),
      onResult,
      onProgress
    );
    console.log(`New RID of rerun job: ${newRid}`);
  } catch (e: any) {
    console.error(`Error rerunning job: ${e.message}`);
    console.log('Note: This example requires a valid RID from a previous text2motion job.');
  }

  await client.close();
}

main().catch(console.error);
