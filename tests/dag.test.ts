import { describe, it, expect, beforeEach } from 'vitest';
import { PolarisRuntime } from '../src/core/runtime';
import { IPlugin, successResult } from '../src/core/types';

describe('DAG – dependsOn Step', () => {
  let runtime: PolarisRuntime;

  // ============================================
  // MOCK CAPABILITIES
  // ============================================
  const advanceCap = {
    name: 'advance/cap-process',
    run: (input: any) => {
      const { amount, accountId } = input.payload || input;      
      if (!amount || amount <= 0) {
        return { status: 'error', error: 'Invalid amount' };
      }
      return successResult(
        { transactionId: `adv-${Date.now()}`, amount, accountId, status: 'paid' },
        'advance',
        `adv-${Date.now()}`,
        'Advance processed'
      );
    }
  };

  const journalCap = {
    name: 'journal/cap-record',
    run: (input: any) => {
      const { amount, accountId, transactionId } = input.payload || input;      
      if (!amount || !transactionId) {
        return { status: 'error', error: 'Missing journal data' };
      }
      return successResult(
        { journalId: `jrn-${Date.now()}`, transactionId, amount, accountId, status: 'posted' },
        'journal',
        `jrn-${Date.now()}`,
        'Journal recorded'
      );
    }
  };

  const saveCap = {
    name: 'repo/cap-save',
    run: (input: any) => {
      const data = input.payload || input;      
      if (!data) return { status: 'error', error: 'No data' };
      return successResult(
        { id: `mock-${Date.now()}`, ...data },
        'repo',
        `mock-${Date.now()}`,
        'Saved'
      );
    }
  };

  const createWorkflowPlugin = (): IPlugin => ({
    name: 'advance-journal',
    version: '1.0.0',
    capabilities: [advanceCap, journalCap, saveCap],
    workflows: [
      {
        name: 'advance-journal/wf-process',
        description: 'Process advance and record journal',
        steps: [
          { name: 'ProcessAdvance', useCapability: 'advance/cap-process' },
          { name: 'SaveAdvance', useCapability: 'repo/cap-save', dependsOn: ['ProcessAdvance'] },
          { name: 'RecordJournal', useCapability: 'journal/cap-record', dependsOn: ['ProcessAdvance'] },
          { name: 'SaveJournal', useCapability: 'repo/cap-save', dependsOn: ['RecordJournal'] }
        ]
      }
    ]
  });

  beforeEach(() => {
    runtime = new PolarisRuntime({ dev: false });
    runtime.register([createWorkflowPlugin()]);
  });

  // ============================================
  // 1. DAG execution order
  // ============================================
  it('should execute steps in correct DAG order', async () => {
    const input = { amount: 1000000, accountId: 'ACC-001' };
    const result = await runtime.execute('advance-journal/wf-process', input);    
    expect(result.status).toBe('success');
    expect(result.payload).toHaveProperty('id');
    expect(result.payload.amount).toBe(1000000);
  });

  // ============================================
  // 2. Output of step A becomes input of step B and C
  // ============================================
  it('should pass output of step A to dependent steps B and C', async () => {
    const input = { amount: 500000, accountId: 'ACC-002' };
    const result = await runtime.execute('advance-journal/wf-process', input);

    expect(result.payload).toHaveProperty('transactionId');
    expect(result.payload.amount).toBe(500000);
    expect(result.payload.status).toBe('posted');
  });

  // ============================================
  // 3. Step fails → dependent steps fail
  // ============================================
  it('should fail when a dependency step fails', async () => {
    const failingPlugin: IPlugin = {
      name: 'failing',
      version: '1.0.0',
      capabilities: [
        { name: 'failing/cap-fail', run: () => { throw new Error('Step A failed'); } }
      ],
      workflows: [
        {
          name: 'failing/wf-fail',
          steps: [
            { name: 'StepA', useCapability: 'failing/cap-fail' },
            { name: 'StepB', useCapability: 'repo/cap-save', dependsOn: ['StepA'] }
          ]
        }
      ]
    };
    runtime.register([failingPlugin]);

    await expect(runtime.execute('failing/wf-fail', {})).rejects.toThrow('Step A failed');
  });

  // ============================================
  // 4. Multiple dependencies (A and B → C)
  // ============================================
  it('should support multiple dependencies (A and B → C)', async () => {
    const plugin: IPlugin = {
      name: 'multi',
      version: '1.0.0',
      capabilities: [
        { name: 'multi/cap-a', run: () => successResult({valueA: 10}, 'multi') },
        { name: 'multi/cap-b', run: () => successResult({valueB: 20}, 'multi') },
        {
          name: 'multi/cap-c',
          run: (input) => {            
            const sum = ((input.payload?.valueA || input.valueA || 0) + (input.payload?.valueB || input.valueB || 0));
            return successResult({ result: sum }, 'multi');
          }
        }
      ],
      workflows: [
        {
          name: 'multi/wf-sum',
          steps: [
            { name: 'A', useCapability: 'multi/cap-a' },
            { name: 'B', useCapability: 'multi/cap-b' },
            { name: 'C', useCapability: 'multi/cap-c', dependsOn: ['A','B'] }
          ]
        }
      ]
    };
    runtime.register([plugin]);

    const result = await runtime.execute('multi/wf-sum', {});
    expect(result.payload.result).toBe(30);
  });

  // ============================================
  // 5. Natural pipeline (tanpa dependsOn)
  // ============================================
  it('should use natural pipeline when no dependsOn', async () => {
    const plugin: IPlugin = {
      name: 'pipe',
      version: '1.0.0',
      capabilities: [
        { name: 'pipe/cap-add', run: (input: any) => {
            const val = input.payload?.value || input.value || 0;
            return successResult({ value: val + 5 }, 'pipe');
          }},
        { name: 'pipe/cap-multiply', run: (input: any) => {
            const val = input.payload?.value || input.value || 0;
            return successResult({ value: val * 2 }, 'pipe');
          }}
      ],
      workflows: [
        {
          name: 'pipe/wf-calc',
          steps: [
            { name: 'Add', useCapability: 'pipe/cap-add' },
            { name: 'Multiply', useCapability: 'pipe/cap-multiply' }
          ]
        }
      ]
    };
    runtime.register([plugin]);

    const result = await runtime.execute('pipe/wf-calc', { value: 10 });
    expect(result.payload.value).toBe(30); // (10 + 5) * 2 = 30
  });
});