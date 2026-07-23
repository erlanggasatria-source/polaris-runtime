import { LocalStorage } from 'node-localstorage';

if (typeof localStorage === 'undefined') {
  // @ts-ignore
  global.localStorage = new LocalStorage('./.localstorage');
}

import { PolarisRuntime } from '../core/runtime';
import { RepoPlugin } from '../plugins/repo.plugin';
import { MeetingPlugin } from '../plugins/meeting.plugin';
import { WorkspacePlugin } from '../plugins/workspace.plugin';

async function main() {
  const runtime = new PolarisRuntime();

  console.log('📦 Registering plugins...\n');
  runtime.register([RepoPlugin, MeetingPlugin, WorkspacePlugin]);

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