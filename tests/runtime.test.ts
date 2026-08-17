import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolarisRuntime } from '../src/core/runtime';
import { IPlugin } from '../src/core/types';
import { createGreetPlugin, createWorkspacePlugin } from './utils/mock-plugins';

describe('Runtime Core', () => {
  let runtime: PolarisRuntime;

  beforeEach(() => {
    runtime = new PolarisRuntime({ dev: true });
  });

  // ============================================
  // 1. Register Plugin
  // ============================================
  it('should register plugin with capabilities and workflows', () => {
    const plugin = createGreetPlugin();
    runtime.register([plugin]);

    expect(runtime['pluginMeta'].has('greet')).toBe(true);
    expect(runtime['capabilities'].has('greet/cap-say-hello')).toBe(true);
    expect(runtime['workflows'].has('greet/wf-hello')).toBe(true);
  });

  // ============================================
  // 2. Duplicate plugin should be skipped
  // ============================================
  it('should skip duplicate plugin registration', () => {
    const plugin = createGreetPlugin();
    runtime.register([plugin]);

    const consoleSpy = vi.spyOn(console, 'warn');
    runtime.register([plugin]);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[WARN]',
      expect.stringContaining('already registered, skipping...')
    );
    consoleSpy.mockRestore();
  });

  // ============================================
  // 3. Execute Workflow
  // ============================================
  it('should execute workflow and return result', async () => {
    runtime.register([createGreetPlugin()]);
    const result = await runtime.execute('greet/wf-hello', { name: 'Budi' });
    expect(result.payload.message).toBe('Hello, Budi!');
  });

  // ============================================
  // 4. Execute Workflow - not found
  // ============================================
  it('should throw error when workflow not found', async () => {
    runtime.register([createGreetPlugin()]);
    await expect(runtime.execute('greet/wf-notfound', {})).rejects.toThrow(
      'Workflow "greet/wf-notfound" not found'
    );
  });

  // ============================================
  // 5. canExecute - static guard
  // ============================================
  it('should check static guard correctly', async () => {
    const plugin: IPlugin = {
      name: 'secure',
      version: '1.0.0',
      capabilities: [{ name: 'secure/cap-1', run: () => ({}) }],
      workflows: [
        {
          name: 'secure/wf-secure',
          allowed: [
            { key: 'role', value: 'admin', source: 'context', operator: 'eq' }
          ],
          steps: [{ name: 'Step1', useCapability: 'secure/cap-1' }]
        }
      ]
    };    

    runtime.register([plugin, createWorkspacePlugin()]);
    runtime.setAllowedContextWorkflow('workspace/wf-set-context');    
    await runtime.execute('workspace/wf-set-context', { role: 'admin' });

    const result = runtime.canExecute('secure/wf-secure', {});    
    expect(result.allowed).toBe(true);

    await runtime.execute('workspace/wf-set-context',{ role: 'member' });
    const result2 = runtime.canExecute('secure/wf-secure', {});    
    expect(result2.allowed).toBe(false);    
  });

  // ============================================
  // 6. Allowed Workflow & Global Context
  // ============================================
  it('should update global context via allowed workflow', async () => {
    runtime.register([createWorkspacePlugin()]);
    runtime.setAllowedContextWorkflow('workspace/wf-set-context');

    await runtime.execute('workspace/wf-set-context', { userId: 'user-001', role: 'leader' });
    const context = runtime.getGlobalContext();
    expect(context.get('userId')).toBe('user-001');
    expect(context.get('role')).toBe('leader');
  });

  // ============================================
  // 7. canExecute with input status
  // ============================================
  it('should check guard with input status', async () => {
    const plugin: IPlugin = {
      name: 'approve',
      version: '1.0.0',
      capabilities: [{ name: 'approve/cap-1', run: () => ({}) }],
      workflows: [
        {
          name: 'approve/wf-approve',
          allowed: [
            { key: 'status', value: 'draft', source: 'input', operator: 'eq' },
            { key: 'role', value: 'admin', source: 'context', operator: 'eq' }
          ],
          steps: [{ name: 'Approve', useCapability: 'approve/cap-1' }]
        }
      ]
    };
    runtime.register([plugin, createWorkspacePlugin()]);
    runtime.setAllowedContextWorkflow('workspace/wf-set-context');
    await runtime.execute('workspace/wf-set-context',{ role: 'admin' });
    const result = await runtime.canExecute('approve/wf-approve', { status: 'draft' });
    expect(result.allowed).toBe(true);
    const result2 = runtime.canExecute('approve/wf-approve', { status: 'scheduled' });
    expect(result2.allowed).toBe(false);
  });

  // ============================================
  // 8. getGlobalContext returns copy
  // ============================================
  it('should return a copy of global context', async () => {
    runtime.register([createWorkspacePlugin()]);
    runtime.setAllowedContextWorkflow('workspace/wf-set-context');
    await runtime.execute('workspace/wf-set-context',{ foo: 'bar' });
    const ctx1 = runtime.getGlobalContext();
    const ctx2 = runtime.getGlobalContext();    
    expect(ctx1).not.toBe(ctx2);
    expect(ctx1.get('foo')).toBe('bar');    
  });
});
