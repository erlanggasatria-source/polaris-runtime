"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_localstorage_1 = require("node-localstorage");
if (typeof localStorage === 'undefined') {
    // @ts-ignore
    global.localStorage = new node_localstorage_1.LocalStorage('./.localstorage');
}
const runtime_1 = require("../core/runtime");
const repo_plugin_1 = require("../plugins/repo-plugin");
const meeting_plugin_1 = require("../plugins/meeting-plugin");
const workspace_plugin_1 = require("../plugins/workspace-plugin");
async function main() {
    const runtime = new runtime_1.PolarisRuntime();
    console.log('📦 Registering plugins...\n');
    runtime.register([repo_plugin_1.RepoPlugin, meeting_plugin_1.MeetingPlugin, workspace_plugin_1.WorkspacePlugin]);
    // ===== SET CONTEXT =====
    runtime.setAllowedContextWorkflow('workspace/wf-set-context');
    await runtime.execute('workspace/wf-set-context', {
        userId: 'user-001',
        workspaceId: 'ws-001',
        role: 'admin'
    });
    console.log('\n📋 Meeting Plugin Test');
    console.log('═══════════════════════\n');
    // ===== CREATE =====
    console.log('1️⃣ CREATE meeting (otomatis langsung dapat list)');
    const result = await runtime.execute('meeting/wf-create', {
        title: 'Rapat Persiapan Acara',
        date: '2026-01-20',
        description: 'Persiapan acara tahunan',
        location: 'Ruang 301'
    });
    console.log('  ✅ Hasil akhir (list meetings):');
    console.log('  📋', JSON.stringify(result, null, 2));
    console.log('\n✅ Meeting Plugin test selesai!');
}
main().catch(console.error);
