"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_js_1 = require("../core/runtime.js");
const dummy_plugin_js_1 = require("../plugins/dummy-plugin.js");
async function main() {
    const runtime = new runtime_js_1.PolarisRuntime();
    runtime.register([dummy_plugin_js_1.DummyPlugin]);
    console.log('📋 Test Event State');
    console.log('═══════════════════\n');
    try {
        await runtime.execute('dummy/wf-greet', { name: 'Budi' });
    }
    catch (error) {
        // ignore
    }
    // Ambil state terakhir (kita perlu tambahkan method getLastState)
    const state = runtime.getLastState();
    if (state) {
        console.log('📊 Workflow State:');
        console.log('  Status:', state.status);
        console.log('  Events:', state.events.length);
        console.log('  Started:', new Date(state.startedAt).toLocaleTimeString());
        if (state.completedAt) {
            console.log('  Completed:', new Date(state.completedAt).toLocaleTimeString());
            console.log('  Duration:', state.completedAt - state.startedAt, 'ms');
        }
        console.log('\n📋 Event Log:');
        for (const event of state.events) {
            const time = new Date(event.timestamp).toLocaleTimeString();
            switch (event.type) {
                case 'workflow_started':
                    console.log(`  🚀 [${time}] Workflow started: ${event.workflowPath}`);
                    break;
                case 'step_started':
                    console.log(`  ▶️  [${time}] Step started: ${event.stepName}`);
                    break;
                case 'step_completed':
                    console.log(`  ✅ [${time}] Step completed: ${event.stepName}`);
                    break;
                case 'workflow_completed':
                    console.log(`  🎉 [${time}] Workflow completed: ${event.workflowPath}`);
                    break;
                case 'workflow_failed':
                    console.log(`  ❌ [${time}] Workflow failed: ${event.error}`);
                    break;
            }
        }
    }
}
main().catch(console.error);
