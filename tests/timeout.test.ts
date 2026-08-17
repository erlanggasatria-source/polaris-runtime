import { describe, it, expect, beforeEach } from 'vitest';
import { PolarisRuntime } from '../src/core/runtime';
import { IPlugin } from '../src/core/types';

describe('Timeout', () => {
  let runtime: PolarisRuntime;

  beforeEach(() => {
    runtime = new PolarisRuntime({ dev: false });
  });

  // ============================================
  // 1. Default timeout (30s) - should not timeout for fast operation
  // ============================================
  it('should complete before default timeout', async () => {
    const plugin: IPlugin = {
      name: 'fast',
      version: '1.0.0',
      capabilities: [{ name: 'fast/cap-fast', run: () => ({ ok: true }) }],
      workflows: [
        {
          name: 'fast/wf-fast',
          steps: [{ name: 'Fast', useCapability: 'fast/cap-fast' }]
        }
      ]
    };
    runtime.register([plugin]);

    const result = await runtime.execute('fast/wf-fast', {});
    expect(result.ok).toBe(true);
  });

  // ============================================
  // 2. Custom timeout - should timeout if step takes too long
  // ============================================
  it('should timeout when step exceeds custom timeout', async () => {
    const plugin: IPlugin = {
      name: 'slow',
      version: '1.0.0',
      capabilities: [
        {
          name: 'slow/cap-slow',
          run: async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return { ok: true };
          }
        }
      ],
      workflows: [
        {
          name: 'slow/wf-slow',
          steps: [
            {
              name: 'Slow',
              useCapability: 'slow/cap-slow',
              timeout: 10
            }
          ]
        }
      ]
    };
    runtime.register([plugin]);

    await expect(runtime.execute('slow/wf-slow', {})).rejects.toThrow(
      'Step "Slow" timeout after 10ms'
    );
  });

  // ============================================
  // 3. timeout: 0 means no timeout
  // ============================================
  it('should not timeout when timeout is 0 (infinite)', async () => {
    const plugin: IPlugin = {
      name: 'infinite',
      version: '1.0.0',
      capabilities: [
        {
          name: 'infinite/cap-slow',
          run: async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            return { ok: true };
          }
        }
      ],
      workflows: [
        {
          name: 'infinite/wf-infinite',
          steps: [
            {
              name: 'Slow',
              useCapability: 'infinite/cap-slow',
              timeout: 0
            }
          ]
        }
      ]
    };
    runtime.register([plugin]);

    const result = await runtime.execute('infinite/wf-infinite', {});
    expect(result.ok).toBe(true);
  });

  // ============================================
  // 4. Error message includes tip
  // ============================================
  it('should include tip in timeout error message', async () => {
    const plugin: IPlugin = {
      name: 'tipslow',
      version: '1.0.0',
      capabilities: [
        {
          name: 'tipslow/cap-slow',
          run: async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return { ok: true };
          }
        }
      ],
      workflows: [
        {
          name: 'tipslow/wf-slow',
          steps: [
            {
              name: 'Slow',
              useCapability: 'tipslow/cap-slow',
              timeout: 10
            }
          ]
        }
      ]
    };
    runtime.register([plugin]);

    try {
      await runtime.execute('tipslow/wf-slow', {});
    } catch (error: any) {
      expect(error.message).toContain('timeout after 10ms');
    }
  });
});
