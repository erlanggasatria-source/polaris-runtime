import { PolarisRuntime } from '../src/core/runtime';
import { DummyPlugin } from '../src/plugins/dummy-plugin';
import { WorkspacePlugin } from '../src/plugins/workspace-plugin';

async function main() {
  const runtime = new PolarisRuntime();

  console.log('📦 Registering plugins...\n');
  runtime.register([WorkspacePlugin, DummyPlugin]);

  // ===== SET ALLOWED WORKFLOW =====
  runtime.setAllowedContextWorkflow('workspace/wf-set-context');
  console.log(`\n🔒 Allowed workflow: ${runtime.getAllowedContextWorkflow()}`);

  console.log('\n📋 Registered:');
  console.log('  Plugins:', runtime.listPlugins());
  console.log('  Workflows:', runtime.listWorkflows());

  // ===== SKENARIO 1: Set global context =====
  console.log('\n═══════════════════════════════════════');
  console.log('📋 SKENARIO 1: Set global context');
  console.log('═══════════════════════════════════════\n');

  await runtime.execute('workspace/wf-set-context', {
    role: 'TREASURER',
    userId: 'user-001',
    userName: 'Budi Santoso',
    workspaceId: 'ws-001',
    workspaceName: 'BEM UI'
  });

  console.log('\n📦 Global context:', Object.fromEntries(runtime.getGlobalContext()));

  // ===== SKENARIO 2: Workflow dengan guard =====
  console.log('\n═══════════════════════════════════════');
  console.log('📋 SKENARIO 2: Workflow dengan guard (role = TREASURER)');
  console.log('═══════════════════════════════════════\n');

  console.log('✅ Menjalankan dummy/wf-secure (role = TREASURER) → seharusnya BERHASIL');
  await runtime.execute('dummy/wf-secure', { name: 'Budi' });

  // ===== SKENARIO 3: Workflow dengan guard gagal =====
  console.log('\n═══════════════════════════════════════');
  console.log('📋 SKENARIO 3: Workflow dengan guard gagal');
  console.log('═══════════════════════════════════════\n');

  // Ubah role bukan TREASURER
  await runtime.execute('workspace/wf-set-context', {
    role: 'MEMBER',
    userId: 'user-001',
    userName: 'Budi Santoso'
  });

  console.log('\n📦 Global context:', Object.fromEntries(runtime.getGlobalContext()));

  console.log('❌ Menjalankan dummy/wf-secure (role = MEMBER) → seharusnya GAGAL');
  try {
    await runtime.execute('dummy/wf-secure', { name: 'Budi' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('✅ Error caught:', message);
  }

  // ===== SKENARIO 4: Workflow dengan multiple guard =====
  console.log('\n═══════════════════════════════════════');
  console.log('📋 SKENARIO 4: Workflow dengan multiple guard');
  console.log('═══════════════════════════════════════\n');

  // Set role TREASURER dan input status WAITING_APPROVAL
  await runtime.execute('workspace/wf-set-context', {
    role: 'TREASURER',
    userId: 'user-001',
    userName: 'Budi Santoso'
  });

  console.log('✅ Menjalankan dummy/wf-secure-status (role=TREASURER, status=WAITING_APPROVAL)');
  await runtime.execute('dummy/wf-secure-status', { 
    name: 'Budi', 
    status: 'WAITING_APPROVAL' 
  });
  console.log('test slow timeout');
  try {
    await runtime.execute('dummy/wf-slow', {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
  }

  console.log('\n✅ Semua skenario selesai!');  
}

main().catch(console.error);