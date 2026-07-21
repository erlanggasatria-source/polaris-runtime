import { PolarisRuntime } from './core/polaris-core.js';
import { DummyPlugin } from './plugins/dummy.js';

async function main() {
  const runtime = new PolarisRuntime();

  console.log('📦 Registering plugins...\n');
  runtime.register([DummyPlugin, DummyPlugin ]);

  console.log('\n📋 Registered:');
  console.log('  Capabilities:', runtime.listCapabilities());
  console.log('  Workflows:', runtime.listWorkflows());

  // ✅ Test: Workflow yang benar
  console.log('\n📋 Test 1: dummy/wf-greet');
  const result1 = await runtime.execute('dummy/wf-greet', { name: 'Budi' });
  console.log('✅ Result:', result1);

  // ❌ Test: Workflow tidak ditemukan
  console.log('\n📋 Test 2: dummy/wf-notfound');
  try {
    await runtime.execute('dummy/wf-notfound', {});
  } catch (error) {
    console.log('✅ Error caught:', error.message);
  }

  // ❌ Test: Capability tidak ditemukan
  console.log('\n📋 Test 3: dummy/cap-notfound');
  try {
    await runtime.executeCapability('dummy/cap-notfound', {});
  } catch (error) {
    console.log('✅ Error caught:', error.message);
  }

  // ❌ Test: Step dengan capability salah
  console.log('\n📋 Test 4: dummy/wf-error-step');
  try {
    await runtime.execute('dummy/wf-error-step', {});
  } catch (error) {
    console.log('✅ Error caught:', error.message);
  }
}

main().catch(console.error);