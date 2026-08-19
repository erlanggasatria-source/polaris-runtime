import { describe, it, expect, beforeEach } from 'vitest';
import { PolarisRuntime } from '../src/core/runtime';
import { IPlugin } from '../src/core/types';
import { createWorkspacePlugin } from './utils/mock-plugins';

describe('Exp Guard', () => {
  let runtime: PolarisRuntime;

  const createExpGuardPlugin = (): IPlugin => ({
    name: 'exp',
    version: '1.0.0',
    description: 'Exp guard test',
    capabilities: [
      { name: 'exp/cap-1', run: () => ({ ok: true }) }
    ],
    workflows: [
      {
        name: 'exp/wf-approve',
        description: 'Approve (only if not creator)',
        allowed: { expr: "status === 'waiting_approval' && createdBy !== userId", input: ['status', 'createdBy'], context: ['userId'] },
        steps: [{ name: 'Approve', useCapability: 'exp/cap-1' }]
      },
      {
        name: 'exp/wf-edit',
        description: 'Edit (only creator)',
        allowed: { expr: "status === 'draft' && createdBy === userId", input: ['status', 'createdBy'], context: ['userId'] },
        steps: [{ name: 'Edit', useCapability: 'exp/cap-1' }]
      },
      {
        name: 'exp/wf-check',
        description: 'Check status === draft and user === creator | admin',
        allowed: {
          expr: "status == 'draft' && (role == 'admin' || createdBy == userId)",
          context: ['role', 'userId'],
          input: ['status', 'createdBy']
        },
        steps: [{ name: 'Step1', useCapability: 'exp/cap-1' }]
      }
    ]
  });

  beforeEach(() => {
    runtime = new PolarisRuntime({ dev: false });
    runtime.register([createWorkspacePlugin(), createExpGuardPlugin()]);
    runtime.setAllowedContextWorkflow('workspace/wf-set-context');
  });

  it('should allow when createdBy != context.userId', async () => {
    await runtime.execute('workspace/wf-set-context', {
      userId: 'user-001',
      role: 'leader'
    });

    const result = await runtime.canExecute('exp/wf-approve', {
      status: 'waiting_approval',
      createdBy: 'user-002'
    });    
    expect(result.allowed).toBe(true);
  });

  it('should NOT allow when createdBy == context.userId', async () => {
    await runtime.execute('workspace/wf-set-context', {
      userId: 'user-001',
      role: 'leader'
    });

    const result = await runtime.canExecute('exp/wf-approve', {
      status: 'waiting_approval',
      createdBy: 'user-001'
    });    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Guard failed');
  });

  it('should allow edit when creator and status draft', async () => {
    await runtime.execute('workspace/wf-set-context', {
      userId: 'user-001',
      role: 'member'
    });

    const result = await runtime.canExecute('exp/wf-edit', {
      status: 'draft',
      createdBy: 'user-001'
    });
    expect(result.allowed).toBe(true);
  });

  it('should NOT allow edit when creator != context.userId', async () => {
    await runtime.execute('workspace/wf-set-context', {
      userId: 'user-001',
      role: 'member'
    });

    const result = await runtime.canExecute('exp/wf-edit', {
      status: 'draft',
      createdBy: 'user-002'
    });
    expect(result.allowed).toBe(false);
  });

  it('should fail if status does not match', async () => {
    await runtime.execute('workspace/wf-set-context', {
      userId: 'user-001',
      role: 'leader'
    });

    const result = await runtime.canExecute('exp/wf-approve', {
      status: 'scheduled',
      createdBy: 'user-002'
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Guard failed');
  });

  it('should evaluate expression correctly', async () => {
    await runtime.execute('workspace/wf-set-context', {role: 'admin', userId: 'user-001'});    

    // Harus allowed: status draft, role admin
    const result1 = runtime.canExecute('exp/wf-check', {
      status: 'draft',
      createdBy: 'user-002'
    });
    expect(result1.allowed).toBe(true);

    // Harus allowed: status draft, createdBy == userId
    await runtime.execute('workspace/wf-set-context', { role: 'member', userId: 'user-001' });        
    const result2 = runtime.canExecute('exp/wf-check', {
      status: 'draft',
      createdBy: 'user-001'
    });
    expect(result2.allowed).toBe(true);

    // Harus tidak allowed: status draft, createdBy != userId, role bukan admin
    const result3 = runtime.canExecute('exp/wf-check', {
      status: 'draft',
      createdBy: 'user-002'
    });
    expect(result3.allowed).toBe(false);
  });

});
