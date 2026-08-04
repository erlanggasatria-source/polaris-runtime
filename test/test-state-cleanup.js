"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_js_1 = require("../core/runtime.js");
const dummy_plugin_js_1 = require("../plugins/dummy-plugin.js");
async function main() {
    const runtime = new runtime_js_1.PolarisRuntime();
    runtime.register([dummy_plugin_js_1.DummyPlugin]);
    console.log('📋 Test State Cleanup');
    console.log('═══════════════════════\n');
    // 1. Execute workflow
    console.log('1️⃣ Execute workflow');
    await runtime.execute('dummy/wf-greet', { name: 'Budi' });
    // 2. Cek state (masih ada)
    console.log('\n2️⃣ State setelah eksekusi:');
    const state1 = runtime.getLastState();
    console.log('  State exists:', !!state1);
    console.log(state1);
    console.log('  Status:', state1?.status);
    // 3. Tunggu 5 detik (state masih ada)
    console.log('\n3️⃣ Tunggu 5 detik...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    const state2 = runtime.getLastState();
    console.log('  State exists:', !!state2);
    // 4. Tunggu 30 detik (state hilang)
    console.log('\n4️⃣ Tunggu 30 detik...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    const state3 = runtime.getLastState();
    console.log('  State exists:', !!state3);
    console.log('  Status:', state3?.status || 'null (cleaned up)');
    console.log('\n✅ Test selesai!');
}
main().catch(console.error);
