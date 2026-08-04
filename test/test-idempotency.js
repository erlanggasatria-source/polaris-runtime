"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// test-idempotency.ts
const runtime_1 = require("../core/runtime");
const dummy_plugin_1 = require("../plugins/dummy-plugin");
async function main() {
    const runtime = new runtime_1.PolarisRuntime();
    runtime.register([dummy_plugin_1.DummyPlugin]);
    console.log('📋 Test Idempotency');
    console.log('═══════════════════════\n');
    const input = { name: 'Budi' };
    // Eksekusi pertama → berhasil
    console.log('1️⃣ Eksekusi pertama:');
    const result1 = await runtime.execute('dummy/wf-greet', input);
    console.log('✅ Result:', result1);
    // Eksekusi kedua (sama) → ditolak
    console.log('\n2️⃣ Eksekusi kedua (sama):');
    try {
        await runtime.execute('dummy/wf-greet', input);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log('❌ Error caught:', message);
    }
    // Eksekusi dengan input berbeda → berhasil
    console.log('\n3️⃣ Eksekusi dengan input berbeda:');
    const result2 = await runtime.execute('dummy/wf-greet', { name: 'Ani' });
    console.log('✅ Result:', result2);
    // Tunggu 31 detik, lalu eksekusi lagi → berhasil
    console.log('\n4️⃣ Tunggu 31 detik, lalu eksekusi lagi:');
    await new Promise(resolve => setTimeout(resolve, 31000));
    const result3 = await runtime.execute('dummy/wf-greet', input);
    console.log('✅ Result:', result3);
}
main().catch(console.error);
