import 'dotenv/config';
import {SaymotionClient} from '../src';

function onProgress(data: { rid: string; progress_percent: number; position_in_queue: number }): void {
    if (data.position_in_queue) {
        console.log(`Position of Job[${data.rid}] in queue: ${data.position_in_queue}`);
    } else {
        console.log(`Progress of Job[${data.rid}]: ${data.progress_percent}%`);
    }
}

async function main(): Promise<void> {
    const client = new SaymotionClient(
        process.env.DM_SAYMOTION_API_SERVER_URL || 'https://api-saymotion.deepmotion.com:443',
        process.env.DM_SAYMOTION_CLIENT_ID!,
        process.env.DM_SAYMOTION_CLIENT_SECRET!
    );

    try {
        const allModels = await client.list_character_models();
        if (!allModels.length) {
            console.log('No models found');
            return;
        }
        const modelId = allModels[0].id;

        const prompts = [
            'A person walking forward slowly',
            'A person waving hello',
            'A person sitting down',
        ];

        console.log('=== Submitting jobs ===');
        let pendingCount = prompts.length;

        let resolveDone!: () => void;
        const allDone = new Promise<void>((resolve) => {
            resolveDone = resolve;
        });

        function onResult(data: {
            rid: string;
            result?: { input: string[]; output: any };
            error?: { code: string; message: string }
        }): void {
            if (data.result) {
                console.log(`Job[${data.rid}] completed successfully!`);
            } else if (data.error) {
                console.log(`Job[${data.rid}] failed: ${data.error.message} (Code: ${data.error.code})`);
            }

            pendingCount -= 1;
            if (pendingCount <= 0) {
                resolveDone();
            }
        }

        for (const prompt of prompts) {
            const rid = await client.start_new_job(
                prompt,
                modelId,
                undefined,
                onResult,
                onProgress,
                10,
                false
            );
            console.log(`Submitted: ${prompt.substring(0, 30)}... -> Job ID: ${rid}`);
        }

        await allDone;
        console.log('\n=== All jobs processed ===');
    } finally {
        await client.close();
    }
}

main().catch(console.error);
