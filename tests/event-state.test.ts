import { describe, it, expect, beforeEach } from 'vitest';
import { PolarisRuntime } from '../src/core/runtime';
import { createGreetPlugin } from './utils/mock-plugins';

describe('Event & State', () => {
  let runtime: PolarisRuntime;

  beforeEach(() => {
    runtime = new PolarisRuntime({ dev: false });
    runtime.register([createGreetPlugin()]);
  });

  // ============================================
  // 1. Subscribe to workflow events
  // ============================================
  it('should emit workflow_started and workflow_completed events', async () => {
    const events: string[] = [];

    const unsubscribe = runtime.subscribeAll((event) => {
      events.push(event.type);
    });

    await runtime.execute('greet/wf-hello', { name: 'Budi' });
    expect(events).toContain('workflow_started');
    expect(events).toContain('step_started');
    expect(events).toContain('step_completed');
    expect(events).toContain('workflow_completed');

    unsubscribe();
  });

  // ============================================
  // 2. Subscribe to specific workflow
  // ============================================
  it('should only receive events for specific workflow', async () => {
    const events: string[] = [];

    const unsubscribe = runtime.subscribe('greet/wf-hello', (event) => {
      events.push(event.type);
    });

    await runtime.execute('greet/wf-hello', { name: 'Budi' });
    expect(events.length).toBeGreaterThan(0);
    expect(events).toContain('workflow_started');

    unsubscribe();
  });

  // ============================================
  // 3. Unsubscribe works
  // ============================================
  it('should stop receiving events after unsubscribe', async () => {
    let count = 0;

    const unsubscribe = runtime.subscribeAll(() => {
      count++;
    });

    await runtime.execute('greet/wf-hello', { name: 'Budi' });
    expect(count).toBeGreaterThan(0);

    const oldCount = count;
    unsubscribe();
    await runtime.execute('greet/wf-hello', { name: 'Ani' });
    expect(count).toBe(oldCount);
  });

  // ============================================
  // 4. Multi-workflow state (parallel executions)
  // ============================================
  it('should handle multiple workflows simultaneously', async () => {
    const plugin = {
      name: 'slow',
      version: '1.0.0',
      capabilities: [
        {
          name: 'slow/cap-wait',
          run: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return { ok: true };
          }
        }
      ],
      workflows: [
        {
          name: 'slow/wf-wait',
          steps: [{ name: 'Wait', useCapability: 'slow/cap-wait' }]
        }
      ]
    };
    runtime.register([plugin]);

    const promises = [
      runtime.execute('slow/wf-wait', { _i: 1}), 
      runtime.execute('slow/wf-wait', { _i: 2}),
      runtime.execute('slow/wf-wait', { _i: 3})
    ];

    const results = await Promise.all(promises);
    expect(results).toHaveLength(3);
    results.forEach((r) => expect(r.ok).toBe(true));
  });

  // ============================================
  // 5. Progress info in event
  // ============================================
  it('should include progress in step_started event', async () => {
    let progress = 0;
    let totalSteps = 0;

    const unsubscribe = runtime.subscribeAll((event) => {
      if (event.type === 'step_started') {
        progress = event.progress || 0;
        totalSteps = event.totalSteps || 0;
      }
    });

    await runtime.execute('greet/wf-hello', { name: 'Budi' });
    expect(progress).toBe(100);
    expect(totalSteps).toBe(1);

    unsubscribe();
  });
});