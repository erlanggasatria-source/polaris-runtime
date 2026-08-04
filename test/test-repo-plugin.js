"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_1 = require("../core/runtime");
const repo_plugin_1 = require("../plugins/repo-plugin");
const node_localstorage_1 = require("node-localstorage");
// Mock localStorage untuk Node.js
if (typeof localStorage === 'undefined') {
    // @ts-ignore
    global.localStorage = new node_localstorage_1.LocalStorage('./.localstorage');
}
async function main() {
    const runtime = new runtime_1.PolarisRuntime();
    runtime.register([repo_plugin_1.RepoPlugin]);
    console.log('📋 Test Repository Plugin');
    console.log('═══════════════════════════\n');
    // ===== SAVE =====
    console.log('1️⃣ SAVE meeting');
    const saveResult = await runtime.executeCapability('repo/cap-save', {
        domain: 'meetings',
        data: { title: 'Rapat Persiapan', status: 'SCHEDULED' }
    });
    console.log('  ID:', saveResult.id);
    console.log('  Record:', saveResult.record);
    // ===== LIST =====
    console.log('\n2️⃣ LIST meetings');
    const listResult = await runtime.executeCapability('repo/cap-list', {
        domain: 'meetings'
    });
    console.log('  Total:', listResult.length);
    console.log('  Data:', listResult);
    // ===== GET =====
    console.log('\n3️⃣ GET meeting by ID');
    const getResult = await runtime.executeCapability('repo/cap-get', {
        domain: 'meetings',
        id: saveResult.id
    });
    console.log('  Found:', getResult);
    // ===== UPDATE =====
    console.log('\n4️⃣ UPDATE meeting');
    const updateResult = await runtime.executeCapability('repo/cap-update', {
        domain: 'meetings',
        id: saveResult.id,
        data: { status: 'COMPLETED' }
    });
    console.log('  Updated:', updateResult.record);
    // ===== DELETE =====
    console.log('\n5️⃣ DELETE meeting');
    await runtime.executeCapability('repo/cap-delete', {
        domain: 'meetings',
        id: saveResult.id
    });
    console.log('  Deleted successfully');
    // ===== VERIFY =====
    console.log('\n6️⃣ VERIFY (list after delete)');
    const afterDelete = await runtime.executeCapability('repo/cap-list', {
        domain: 'meetings'
    });
    console.log('  Total:', afterDelete.length);
    console.log('\n✅ Test repository selesai!');
}
main().catch(console.error);
