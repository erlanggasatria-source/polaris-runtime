import { describe, it, expect, beforeEach } from 'vitest';
import { PolarisRuntime } from '../src/core/runtime';
import { IPlugin } from '../src/core/types';
import { createWorkspacePlugin } from './utils/mock-plugins';

describe('Dynamic Guard', () => {
  let runtime: PolarisRuntime;

  const createDynamicGuardPlugin = (): IPlugin => ({
    name: 'dynamic',
    version: '1.0.0',
    description: 'Dynamic guard test',
    capabilities: [
      { name: 'dynamic/cap-1', run: () => ({ ok: true }) }
    ],
    workflows: [
      {
        name: 'dynamic/wf-approve',
        description: 'Approve (only if not creator)',
        allowed: [
          {
            key: 'status',
            source: 'input',
            operator: 'eq',
            value: 'waiting_approval'
          },
          {
            key: 'createdBy',
            source: 'input',
            operator: 'neq',
            value: { key: 'userId', source: 'context' }
          }
        ],
        steps: [{ name: 'Approve', useCapability: 'dynamic/cap-1' }]
      },
      {
        name: 'dynamic/wf-edit',
        description: 'Edit (only creator)',
        allowed: [
          {
            key: 'status',
            source: 'input',
            operator: 'eq',
            value: 'draft'
          },
          {
            key: 'createdBy',
            source: 'input',
            operator: 'eq',
            value: { key: 'userId', source: 'context' }
          }
        ],
        steps: [{ name: 'Edit', useCapability: 'dynamic/cap-1' }]
      }
    ]
  });

  beforeEach(() => {
    runtime = new PolarisRuntime({ dev: false });
    runtime.register([createWorkspacePlugin(), createDynamicGuardPlugin()]);
    runtime.setAllowedContextWorkflow('workspace/wf-set-context');
  });

  it('should set global context via workspace/wf-set-context', async () => {
    await runtime.execute('workspace/wf-set-context', {
      userId: 'user-001',
      role: 'leader'
    });

    const context = runtime.getGlobalContext();
    expect(context.get('userId')).toBe('user-001');
    expect(context.get('role')).toBe('leader');
  });

  it('should allow when createdBy != context.userId', async () => {
    await runtime.execute('workspace/wf-set-context', {
      userId: 'user-001',
      role: 'leader'
    });

    const result = await runtime.canExecute('dynamic/wf-approve', {
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

    const result = await runtime.canExecute('dynamic/wf-approve', {
      status: 'waiting_approval',
      createdBy: 'user-001'
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('{context.userId}');
  });

  it('should allow edit when creator and status draft', async () => {
    await runtime.execute('workspace/wf-set-context', {
      userId: 'user-001',
      role: 'member'
    });

    const result = await runtime.canExecute('dynamic/wf-edit', {
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

    const result = await runtime.canExecute('dynamic/wf-edit', {
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

    const result = await runtime.canExecute('dynamic/wf-approve', {
      status: 'scheduled',
      createdBy: 'user-002'
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('input.status eq "waiting_approval"');
  });
});
