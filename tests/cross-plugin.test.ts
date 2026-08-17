// Updated test file content
import { describe, it, expect, beforeEach } from 'vitest';
import { PolarisRuntime } from '../src/core/runtime';
import { IPlugin } from '../src/core/types';
import { createGreetPlugin } from './utils/mock-plugins';

describe('Cross-Plugin Dependency', () => {
  let runtime: PolarisRuntime;

  // ============================================
  // PLUGIN A: Uses capability dari Plugin B
  // ============================================
  const createPluginA = (): IPlugin => ({
    name: 'plugin-a',
    version: '1.0.0',
    description: 'Plugin A uses capability from Plugin B',
    capabilities: [],
    workflows: [
      {
        name: 'plugin-a/wf-use-greet',
        steps: [{ name: 'UseGreet', useCapability: 'greet/cap-say-hello' }]
      }
    ]
  });

  beforeEach(() => {
    runtime = new PolarisRuntime({ dev: false });
    // Plugin B harus diregister dulu
    runtime.register([createGreetPlugin()]);
  });

  // ============================================
  // 1. Plugin A uses capability from Plugin B
  // ============================================
  it('should allow Plugin A to use capability from Plugin B', async () => {
    runtime.register([createPluginA()]);

    const result = await runtime.execute('plugin-a/wf-use-greet', { name: 'Budi' });
    expect(result.payload.message).toBe('Hello, Budi!');
  });

  // ============================================
  // 2. Error when capability not found
  // ============================================
  it('should throw error when capability not found', async () => {
    const plugin: IPlugin = {
      name: 'bad',
      version: '1.0.0',
      capabilities: [],
      workflows: [
        {
          name: 'bad/wf-use-missing',
          steps: [{ name: 'UseMissing', useCapability: 'missing/cap-1' }]
        }
      ]
    };

    runtime.register([plugin]);
    await expect(runtime.execute('bad/wf-use-missing', {})).rejects.toThrow(
      'Capability "missing/cap-1" not found'
    );
  });

  // ============================================
  // 3. Dependency visualization in catalog
  // ============================================
  it('should detect cross-plugin dependency in catalog', () => {
    runtime.register([createPluginA()]);
    const catalog = runtime['buildCatalog']();

    const pluginA = catalog.plugins.find((p: any) => p.name === 'plugin-a');
    expect(pluginA).toBeDefined();
    expect(pluginA.dependencies).toContain('greet');
  });
});
