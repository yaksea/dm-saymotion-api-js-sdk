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
