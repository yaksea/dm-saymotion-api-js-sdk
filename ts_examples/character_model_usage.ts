import 'dotenv/config';
import { SaymotionClient } from '../src';

async function main(): Promise<void> {
  const client = new SaymotionClient(
    process.env.DM_SAYMOTION_API_SERVER_URL || 'https://api-saymotion.deepmotion.com:443',
    process.env.DM_SAYMOTION_CLIENT_ID!,
    process.env.DM_SAYMOTION_CLIENT_SECRET!
  );

  // List Character Models
  console.log('=== Listing All Models ===');
  const allModels = await client.list_character_models();

  console.log('\nAll Models:');
  for (const model of allModels) {
    console.log(`  ${model.name} (ID: ${model.id}, Platform: ${model.platform})`);
  }

  // Upload Custom Character Model
  console.log('\n=== Uploading Custom Model ===');
  try {
    const modelId = await client.upload_character_model(
      '../test_data/test_character.glb',
      'My Custom Character'
    );
    console.log(`Uploaded model ID: ${modelId}`);

    // Delete Character Model
    console.log('\n=== Deleting Model ===');
    const deletedCount = await client.delete_character_model(modelId);
    console.log(`Deleted ${deletedCount} model(s)`);
  } catch (e: any) {
    console.log(`Upload/delete skipped: ${e.message}`);
    console.log('(Ensure test_character.glb exists for full demo)');
  }

  // Get Specific Model by ID
  if (allModels.length) {
    console.log('\n=== Get Specific Model ===');
    const firstModelId = allModels[0].id;
    const specificModels = await client.list_character_models(firstModelId);
    if (specificModels.length) {
      const model = specificModels[0];
      console.log(`Model: ${model.name}`);
      console.log(`  ID: ${model.id}`);
      console.log(`  Platform: ${model.platform}`);
      console.log(`  Rig ID: ${model.rigId}`);
    }
  }

  console.log('\n=== Done! ===');
  await client.close();
}

main().catch(console.error);
