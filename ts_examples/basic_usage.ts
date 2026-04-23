import 'dotenv/config';
import { SaymotionClient, Text2MotionParams } from '../src';

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
