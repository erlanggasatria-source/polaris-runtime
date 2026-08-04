"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_1 = require("../core/runtime");
const dummy_plugin_1 = require("../plugins/dummy-plugin");
const workspace_plugin_1 = require("../plugins/workspace-plugin");
async function main() {
    const runtime = new runtime_1.PolarisRuntime();
    console.log('📦 Registering plugins...\n');
    runtime.register([workspace_plugin_1.WorkspacePlugin, dummy_plugin_1.DummyPlugin]);
    runtime.setAllowedContextWorkflow('workspace/wf-set-context');
    // ===== SET CONTEXT =====
    await runtime.execute('workspace/wf-set-context', {
        role: 'TREASURER',
        userId: 'user-001',
        userName: 'Budi Santoso'
    });
    console.log('\n📦 Global context:', Object.fromEntries(runtime.getGlobalContext()));
    // ===== TEST canExecute =====
    console.log('\n═══════════════════════════════════════');
    console.log('📋 TEST canExecute');
    console.log('═══════════════════════════════════════\n');
    // 1. Workflow dengan guard → allowed
    const result1 = runtime.canExecute('dummy/wf-secure', {});
    console.log('1️⃣ dummy/wf-secure (role = TREASURER) →', result1.allowed ? '✅ ALLOWED' : '❌ DENIED');
    // 2. Workflow dengan guard + input
    const result2 = runtime.canExecute('dummy/wf-secure-status', { status: 'WAITING_APPROVAL' });
    console.log('2️⃣ dummy/wf-secure-status (status = WAITING_APPROVAL) →', result2.allowed ? '✅ ALLOWED' : '❌ DENIED');
    // 3. Workflow tanpa guard
    const result3 = runtime.canExecute('dummy/wf-greet', {});
    console.log('3️⃣ dummy/wf-greet (tanpa guard) →', result3.allowed ? '✅ ALLOWED' : '❌ DENIED');
    // 4. Ubah role → tidak allowed
    await runtime.execute('workspace/wf-set-context', { role: 'MEMBER' });
    const result4 = runtime.canExecute('dummy/wf-secure', {});
    console.log('4️⃣ dummy/wf-secure (role = MEMBER) →', result4.allowed ? '✅ ALLOWED' : '❌ DENIED');
    if (!result4.allowed) {
        console.log('   Reason:', result4.reason);
    }
    console.log('\n✅ Test canExecute selesai!');
}
main().catch(console.error);
