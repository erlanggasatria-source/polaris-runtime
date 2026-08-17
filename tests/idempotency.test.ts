import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolarisRuntime } from '../src/core/runtime';
import { createGreetPlugin } from './utils/mock-plugins';

describe('Idempotency', () => {
  let runtime: PolarisRuntime;

  beforeEach(() => {
    runtime = new PolarisRuntime({ dev: false });
    runtime.register([createGreetPlugin()]);    
  });

  // ============================================
  // 1. Duplicate execution is blocked
  // ============================================
  it('should block duplicate workflow execution', async () => {
    const input = { name: 'Budi' };

    const result1 = await runtime.execute('greet/wf-hello', input);
    expect(result1.payload.message).toBe('Hello, Budi!');

    await expect(runtime.execute('greet/wf-hello', input)).rejects.toThrow(
      'Duplicate workflow execution detected'
    );
  });

  // ============================================
  // 2. Different input is allowed
  // ============================================
  it('should allow execution with different input', async () => {
    const result1 = await runtime.execute('greet/wf-hello', { name: 'Budi' });
    expect(result1.payload.message).toBe('Hello, Budi!');

    const result2 = await runtime.execute('greet/wf-hello', { name: 'Ani' });
    expect(result2.payload.message).toBe('Hello, Ani!');
  });

  // ============================================
  // 3. After TTL, same input is allowed again
  // ============================================
  it('should allow duplicate after TTL expires', async () => {
    vi.useFakeTimers();

    const input = { name: 'Budi' };
    await runtime.execute('greet/wf-hello', input);    
    // Simulate TTL expiry by clearing store    
    setTimeout(async()=>{
    const result = await runtime.execute('greet/wf-hello', input);    
    expect(result.payload.message).toBe('Hello, Budi!');
    },35000);
    vi.advanceTimersByTime(40000);
    vi.useRealTimers();
  });

  // ============================================
  // 4. Different workflow with same input is allowed
  // ============================================
  it('should allow same input for different workflows', async () => {
    const plugin = {
      name: 'other',
      version: '1.0.0',
      capabilities: [{ name: 'other/cap-1', run: () => ({ ok: true }) }],
      workflows: [
        {
          name: 'other/wf-1',
          steps: [{ name: 'Step1', useCapability: 'other/cap-1' }]
        }
      ]
    };
    runtime.register([plugin]);

    await runtime.execute('greet/wf-hello', { name: 'Budi' });
    const result = await runtime.execute('other/wf-1', { name: 'Budi' });
    expect(result.ok).toBe(true);
  });
});
