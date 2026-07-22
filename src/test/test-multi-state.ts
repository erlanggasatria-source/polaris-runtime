import { PolarisRuntime } from "../core/runtime";
import { DummyPlugin } from "../plugins/dummy.plugin";

async function main() {
  const runtime = new PolarisRuntime();
  runtime.register([DummyPlugin]);

  console.log('📋 Test Multi-Workflow State');
  console.log('═════════════════════════════\n');

  // 1. Jalankan 3 workflow hampir bersamaan
  console.log('1️⃣ Running 3 workflows simultaneously...\n');

  const promises = [
    runtime.execute('dummy/wf-greet', { name: 'Budi' }),
    runtime.execute('dummy/wf-greet', { name: 'Ani' }),
    runtime.execute('dummy/wf-math', { a: 5, b: 3 })
  ];

  await Promise.all(promises);

  // 2. Lihat semua states
  console.log('\n2️⃣ All states:');
  const allStates = runtime.getAllStates();
  console.log(`  Total states: ${allStates.length}`);

  for (const state of allStates) {
    console.log(`\n  📊 ${state.id}`);
    console.log(`     Workflow: ${state.workflowPath}`);
    console.log(`     Status: ${state.status}`);
    console.log(`     Events: ${state.events.length}`);
    console.log(`     Duration: ${(state.completedAt || state.startedAt) - state.startedAt}ms`);
  }

  // 3. Cek individual state
  console.log('\n3️⃣ Individual state:');
  const lastState = runtime.getLastState();
  if (lastState) {
    console.log(`  Last state: ${lastState.id}`);
    console.log(`  Workflow: ${lastState.workflowPath}`);
    console.log(`  Status: ${lastState.status}`);
  }

  // 4. Tunggu 31 detik -> state hilang
  console.log('\n4️⃣ Waiting 31 seconds for cleanup...');
  await new Promise(resolve => setTimeout(resolve, 31000));

  const afterCleanup = runtime.getAllStates();
  console.log(`  States after cleanup: ${afterCleanup.length}`);

  console.log('\n✅ Test selesai!');
}

main().catch(console.error);