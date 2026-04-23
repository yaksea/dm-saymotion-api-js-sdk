require('dotenv').config();

const { SaymotionClient, RenderParams, Status } = require('dm-saymotion-api');

const OUTPUT_DIR = './output';

async function main() {
  const client = new SaymotionClient(
    process.env.DM_SAYMOTION_API_SERVER_URL || 'https://api-saymotion.deepmotion.com:443',
    process.env.DM_SAYMOTION_CLIENT_ID,
    process.env.DM_SAYMOTION_CLIENT_SECRET
  );

  function onProgress(data) {
    if (data.position_in_queue) {
      console.log(`Position in queue: ${data.position_in_queue}`);
    } else {
      console.log(`Progress: ${data.progress_percent}%`);
    }
  }

  async function onResult(data) {
    if (data.result) {
      console.log('Render job completed successfully!');
      if (data.result.output) {
        console.log(`Output: ${JSON.stringify(data.result.output)}`);
      }
      console.log('Downloading results...');
      await client.download_job(data.rid, OUTPUT_DIR);
    } else if (data.error) {
      console.error(`Render job failed: ${data.error.message} (Code: ${data.error.code})`);
    }
  }

  try {
    const balance = await client.get_credit_balance();
    console.log(`Credit balance: ${balance}`);

    if (balance <= 0) {
      console.log('No credit, cannot process job');
      return;
    }

    // List completed text2motion jobs (render needs a completed text2motion job)
    const jobs = await client.list_jobs(
      [Status.SUCCESS],
      'text2motion'
    );
    if (!jobs.length) {
      console.log('No completed text2motion jobs found.');
      console.log('Run basic_usage.js first to create a text2motion job.');
      return;
    }

    // Use the first completed job
    const t2mRid = jobs[0].rid;
    let variantId = 1;
    if (jobs[0].variants && typeof jobs[0].variants === 'object') {
      const firstKey = Object.keys(jobs[0].variants)[0] || '1';
      variantId = parseInt(firstKey, 10) || 1;
    }

    const params = new RenderParams({
      variant_id: variantId,
      backdrop: 'studio',
      shadow: 1,
      cam_mode: 0,
    });

    console.log('\n=== Starting render job ===');
    console.log(`t2m_rid: ${t2mRid}, variant_id: ${variantId}`);

    const rid = await client.start_render_job(
      t2mRid,
      params,
      onResult,
      onProgress
    );
    console.log(`Render job finished, RID: ${rid}`);

    console.log('\n=== Done! ===');
  } finally {
    await client.close();
  }
}

main().catch(console.error);
