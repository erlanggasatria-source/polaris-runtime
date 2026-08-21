import {
  IPlugin,
  ICapability,
  IWorkflow,
  IContext,
  IWorkflowEvent,
  IWorkflowState,
  IAllowedGuard,
  IResult,
  IExpressionGuard
} from './types';
import { logger, LogLevel } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import { isTypedArray } from 'util/types';

export class PolarisRuntime {
  private pluginMeta: Map<string, { version: string; description: string }> = new Map();
  private capabilities: Map<string, ICapability> = new Map();
  private workflows: Map<string, IWorkflow> = new Map();
  private globalContext: Map<string, any> = new Map();
  private allowedContextWorkflow: string | null = null;
  private idempotencyStore: Map<string, number> = new Map();
  private states: Map<string, IWorkflowState> = new Map();
  private stateCleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private subscribers: Map<string, ((event: IWorkflowEvent) => void)[]> = new Map();
  private readonly IDEMPOTENCY_TTL = 30000;
  private readonly STATE_TTL = 30000;
  private isDev: boolean = false;

  // ===== CONSTRUCTOR =====
  constructor(options?: { dev?: boolean }) {
    this.isDev = options?.dev || false;
    if (this.isDev) {
      logger.setLevel(LogLevel.VERBOSE);
      logger.info('🔧 Polaris Runtime initialized in DEVELOPMENT mode');
    } else {
      logger.setLevel(LogLevel.ERROR);
      logger.info('🚀 Polaris Runtime initialized in PRODUCTION mode');
    }
  }

  // ===== PUBLIC API =====

  // Register plugins
  register(plugins: IPlugin[]): void {
    logger.verbose(`Registering ${plugins.length} plugin(s)...`);
    for (const plugin of plugins) {
      this.registerPlugin(plugin);
    }
    logger.info(`✅ ${plugins.length} plugin(s) registered successfully`);
    if (this.isDev) {
      this.generateExplorer();
    }
  }

  // Execute workflow
  async execute(workflowPath: string, input: any): Promise<any> {
    logger.verbose(`🚀 Executing workflow: ${workflowPath}`);
    logger.debug(`Input:`, input);

    const idKey = this.generateIdempotencyKey(workflowPath, input);
    if (this.checkIdempotency(idKey)) {
      const error = new Error(`Duplicate workflow execution detected: ${workflowPath}`);
      logger.error(`❌ ${error.message}`);
      throw error;
    }
    this.idempotencyStore.set(idKey, Date.now());

    const workflow = this.workflows.get(workflowPath);
    if (!workflow) {
      logger.error(`❌ Workflow not found: "${workflowPath}"`);
      throw new Error(`Workflow "${workflowPath}" not found`);
    }

    if (this.isExpressionGuard(workflow.allowed)){
      const { passed, actualValue, expectedValue }  = this.checkExpression(workflow.allowed, input);
      logger.verbose(`   ${expectedValue} ${actualValue} → ${passed ? '✅' : '❌'}`);
      if (!passed) {
        const error = new Error(`Workflow "${workflowPath}" not allowed to execute`);
        logger.error(`❌ ${error.message}`);
        throw error;
      }
    }
    else
    {
      if (workflow.allowed && workflow.allowed.length > 0) {
        logger.verbose(`🛡️ Checking guards for: ${workflowPath}`);
        for (const guard of workflow.allowed) {
          const passed = this.checkGuard(guard, input);
          logger.verbose(`   ${guard.source}.${guard.key} ${guard.operator || 'eq'} ${guard.value} → ${passed ? '✅' : '❌'}`);
          if (!passed) {
            const error = new Error(`Workflow "${workflowPath}" not allowed to execute`);
            logger.error(`❌ ${error.message}`);
            throw error;
          }
        }
      }
    }

    const executionId = this.generateExecutionId(workflowPath);
    const context: IContext = {
      id: `ctx_${Date.now()}`,
      variables: new Map(),
      steps: new Map(),
      input,
      context: new Map(this.globalContext)
    };

    const state: IWorkflowState = {
      id: executionId,
      workflowPath,
      status: 'running',
      events: [],
      startedAt: Date.now()
    };
    this.states.set(executionId, state);

    this.emitEvent(executionId, {
      type: 'workflow_started',
      workflowPath,
      input,
      timestamp: Date.now()
    });

    logger.verbose(`📝 ${workflow.description || 'No description'}`);
    logger.verbose(`📦 Global context:`, Object.fromEntries(this.globalContext));

    let result = input;
    const totalSteps = workflow.steps.length;

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const stepIndex = i + 1;
      const progress = Math.round((stepIndex / totalSteps) * 100);

      try {
        logger.verbose(`  ▶️  Step ${stepIndex}/${totalSteps}: ${step.name}`);

        let stepInput: any;
        if (step.dependsOn && step.dependsOn.length > 0) {
          let mergedPayload: any = {};
      let baseResult: any = null;

      for (const dep of step.dependsOn) {
        const depResult = context.steps.get(dep);
          if (depResult) {
            // Ambil payload dari depResult
            const payload = depResult.payload !== undefined ? depResult.payload : depResult;
            
            if (typeof payload === 'object' && payload !== null) {
              mergedPayload = { ...mergedPayload, ...payload };
            } else {
              mergedPayload[dep] = payload;
              logger.warn(`   ⚠️ Dependency "${dep}" returned non-object payload, stored under key "${dep}"`);
            }

            // Simpan baseResult pertama (untuk mempertahankan IResult)
            if (!baseResult) {
              baseResult = depResult;
            }
          } else {
            logger.warn(`   ⚠️ Dependency "${dep}" not found, skipping...`);
          }
        }

        if (baseResult) {
          // Gabungkan payload ke baseResult
          stepInput = {
            ...baseResult,
            payload: mergedPayload
          };
        } else {
          // Tidak ada dependency yang ditemukan
          stepInput = {};
        }
        } else {
          stepInput = result;
        }

        const cap = this.capabilities.get(step.useCapability);
        if (!cap) {
          logger.error(`❌ Capability not found: "${step.useCapability}"`);
          throw new Error(`Capability "${step.useCapability}" not found`);
        }

        logger.verbose(`     ⚡ ${step.useCapability}`);
        logger.verbose(`     📝 ${cap.description || 'No description'}`);

        const timeoutMs = step.timeout ?? 30000;
        let stepResult: any;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        this.emitEvent(executionId, {
          type: 'step_started',
          workflowPath,
          stepName: step.name,
          stepIndex,
          totalSteps,
          progress,
          timestamp: Date.now()
        });

        if (timeoutMs === 0) {
          stepResult = await cap.run(stepInput, context);
        } else {
          try {
            stepResult = await Promise.race([
              cap.run(stepInput, context),
              new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                  reject(new Error(`⏰ Step "${step.name}" timeout after ${timeoutMs}ms`));
                }, timeoutMs);
              })
            ]);
          } finally {
            if (timeoutId) clearTimeout(timeoutId);
          }
        }

        result = stepResult;
        context.steps.set(step.name, result);

        this.emitEvent(executionId, {
          type: 'step_completed',
          workflowPath,
          stepName: step.name,
          output: result,
          timestamp: Date.now()
        });

        logger.verbose(`  ✅ Step ${stepIndex}/${totalSteps} completed`);

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Step "${step.name}" failed:`, message);
        logger.debug(`   📍 Workflow: ${workflowPath}`);
        logger.debug(`   📍 Input:`, JSON.stringify(input, null, 2));

        this.emitEvent(executionId, {
          type: 'workflow_failed',
          workflowPath,
          error: message,
          timestamp: Date.now()
        });

        state.status = 'failed';
        state.completedAt = Date.now();
        this.scheduleStateCleanup(executionId);

        throw error;
      }
    }

    state.status = 'completed';
    state.completedAt = Date.now();

    this.emitEvent(executionId, {
      type: 'workflow_completed',
      workflowPath,
      output: result,
      timestamp: Date.now()
    });

    if (workflowPath === this.allowedContextWorkflow) {
      const lastStepName = workflow.steps[workflow.steps.length - 1]?.name;
      const contextResult = lastStepName ? context.steps.get(lastStepName) : result;
      if (contextResult && typeof contextResult === 'object') {
        this.updateGlobalContext(contextResult.payload);
      }
    }

    logger.info(`✅ Workflow completed: ${workflowPath}`);
    this.scheduleStateCleanup(executionId);

    return result;
  }

  // Check permission
  canExecute(workflowPath: string, input: any = {}): { allowed: boolean; reason?: string } {
    logger.verbose(`🔍 Checking permission: ${workflowPath}`);
    const workflow = this.workflows.get(workflowPath);
    if (!workflow) {
      return { allowed: false, reason: `Workflow "${workflowPath}" not found` };
    }

    if (!workflow.allowed || (!this.isExpressionGuard(workflow.allowed) && workflow.allowed.length === 0)) {
      logger.verbose(`  ✅ No guards, allowed`);
      return { allowed: true };
    }

    if (this.isExpressionGuard(workflow.allowed)){
      const checkExpression = this.checkExpression(workflow.allowed, input)      
      const { passed, actualValue, expectedValue } = checkExpression;
      if (!passed) {
        const reason = `Guard failed: ${expectedValue} (actual: ${actualValue})`;
        logger.warn(`  ❌ ${reason}`);
        return { allowed: false, reason };
      }      
    } else
    {
      for (const guard of workflow.allowed) {
        const { passed, actualValue, expectedValue } = this.checkGuard(guard, input);
        if (!passed) {
          // Format expected value untuk log
          let expectedStr: string;
          if (guard.value && typeof guard.value === 'object' && guard.value.key && guard.value.source) {
            expectedStr = `{${guard.value.source}.${guard.value.key}}`;
          } else {
            expectedStr = JSON.stringify(guard.value);
          }
          const reason = `Guard failed: ${guard.source}.${guard.key} ${guard.operator||'eq'} ${expectedStr} (actual: ${actualValue})`;
          logger.warn(`  ❌ ${reason}`);
          return { allowed: false, reason };
        }
      }
    }

    logger.verbose(`  ✅ All guards passed`);
    return { allowed: true };
  }

  // Subscribe
  subscribe(workflowPath: string, callback: (event: IWorkflowEvent) => void): () => void {
    logger.verbose(`📡 Subscribing to: ${workflowPath}`);

    if (!this.subscribers.has(workflowPath)) {
      this.subscribers.set(workflowPath, []);
    }
    this.subscribers.get(workflowPath)!.push(callback);

    return () => {
      const callbacks = this.subscribers.get(workflowPath);
      if (callbacks) {
        const filtered = callbacks.filter(cb => cb !== callback);
        if (filtered.length === 0) {
          this.subscribers.delete(workflowPath);
        } else {
          this.subscribers.set(workflowPath, filtered);
        }
        logger.verbose(`📡 Unsubscribed from: ${workflowPath}`);
      }
    };
  }

  subscribeAll(callback: (event: IWorkflowEvent) => void): () => void {
    logger.verbose(`📡 Subscribing to ALL events`);
    return this.subscribe('*', callback);
  }

  // Context
  setAllowedContextWorkflow(workflowPath: string): void {
    logger.verbose(`🔒 Allowed context workflow: ${workflowPath}`);
    this.allowedContextWorkflow = workflowPath;
    if (this.isDev) {
      this.generateExplorer();
    }
  }

  getAllowedContextWorkflow(): string | null {
    return this.allowedContextWorkflow;
  }

  getGlobalContext(): Map<string, any> {
    logger.info('📦 getGlobalContext() called, size:', this.globalContext.size);
    return new Map(this.globalContext);
  }

  // ===== PRIVATE / INTERNAL =====

  private registerPlugin(plugin: IPlugin): void {
    logger.verbose(`Registering plugin: ${plugin.name} v${plugin.version}`);

    try {
      const existingPlugin = this.pluginMeta.has(plugin.name);

      if (existingPlugin) {
        logger.warn(`⚠️ Plugin "${plugin.name}" already registered, skipping...`);
        return;
      }

      this.pluginMeta.set(plugin.name, {
        version: plugin.version || '1.0.0',
        description: plugin.description || ''
      });

      if (plugin.capabilities) {
        for (const cap of plugin.capabilities) {
          if (this.capabilities.has(cap.name)) {
            throw new Error(`Capability "${cap.name}" already registered`);
          }
          this.capabilities.set(cap.name, cap);
          logger.verbose(`  ⚡ ${cap.name}`);
        }
      }

      if (plugin.workflows) {
        for (const wf of plugin.workflows) {
          if (this.workflows.has(wf.name)) {
            throw new Error(`Workflow "${wf.name}" already registered`);
          }
          this.workflows.set(wf.name, wf);
          logger.verbose(`  🔄 ${wf.name}`);
        }
      }

      logger.info(`✅ Plugin registered: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Failed to register plugin "${plugin.name}":`, message);
      throw error;
    }
  }

  private executeCapability(capPath: string, input: any): Promise<any> {
    logger.verbose(`⚡ Executing capability: ${capPath}`);
    const cap = this.capabilities.get(capPath);
    if (!cap) {
      throw new Error(`Capability "${capPath}" not found`);
    }

    const context: IContext = {
      id: `cap_${Date.now()}`,
      variables: new Map(),
      steps: new Map(),
      input,
      context: new Map(this.globalContext)
    };

    return cap.run(input, context);
  }

  private updateGlobalContext(updates: Record<string, any>): void {
    logger.verbose(`📦 Updating global context:`, updates);
    for (const [key, value] of Object.entries(updates)) {
      this.globalContext.set(key, value);
    }
    logger.info(`✅ Global context updated`);
  }

  private generateIdempotencyKey(workflowPath: string, input: any): string {
    const inputString = JSON.stringify(input);
    return `${workflowPath}:${inputString}`;
  }

  private checkIdempotency(key: string): boolean {
    const now = Date.now();
    for (const [k, timestamp] of this.idempotencyStore) {
      if (now - timestamp > this.IDEMPOTENCY_TTL) {
        this.idempotencyStore.delete(k);
      }
    }
    return this.idempotencyStore.has(key);
  }

  private generateExecutionId(workflowPath: string): string {
    const random = Math.random().toString(36).substring(2, 8);
    return `${workflowPath}:${Date.now()}:${random}`;
  }

  private emitEvent(executionId: string, event: IWorkflowEvent): void {
    const state = this.states.get(executionId);
    if (state) {
      state.events.push(event);
    }

    const callbacks = this.subscribers.get(event.workflowPath) || [];
    for (const cb of callbacks) {
      cb(event);
    }

    const allCallbacks = this.subscribers.get('*') || [];
    for (const cb of allCallbacks) {
      cb(event);
    }
  }

  private scheduleStateCleanup(executionId: string): void {
    const existingTimer = this.stateCleanupTimers.get(executionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.stateCleanupTimers.delete(executionId);
    }

    const timer = setTimeout(() => {
      this.states.delete(executionId);
      this.stateCleanupTimers.delete(executionId);
      logger.verbose(`🧹 State cleaned up: ${executionId}`);
    }, this.STATE_TTL);

    this.stateCleanupTimers.set(executionId, timer);
  }

  private checkGuard(guard: IAllowedGuard, input: any): { passed: boolean; actualValue: any; expectedValue: any; } {
    // 1. Ambil actualValue
    let actualValue: any;
    if (guard.source === 'context') {
      actualValue = this.globalContext.get(guard.key);
    } else {
      actualValue = input[guard.key];
    }

    // 2. Tentukan expectedValue
    let expectedValue: any = guard.value;
    // Cek apakah guard.value adalah object dengan key dan source (dynamic)
    if (guard.value && typeof guard.value === 'object' && guard.value.key && guard.value.source) {
      if (guard.value.source === 'context') {
        expectedValue = this.globalContext.get(guard.value.key);
      } else {
        expectedValue = input[guard.value.key];
      }
    }

    // 3. Evaluasi operator
    const operator = guard.operator || 'eq';
    let passed = false;
    switch (operator) {
      case 'eq': passed = actualValue === expectedValue; break;
      case 'neq': passed = actualValue !== expectedValue; break;
      case 'in': passed = Array.isArray(expectedValue) && expectedValue.includes(actualValue); break;
      case 'nin': passed = Array.isArray(expectedValue) && !expectedValue.includes(actualValue); break;
      case 'gt': passed = actualValue > expectedValue; break;
      case 'lt': passed = actualValue < expectedValue; break;
      case 'gte': passed = actualValue >= expectedValue; break;
      case 'lte': passed = actualValue <= expectedValue; break;
      default: passed = false;
    }

    return { passed, actualValue, expectedValue };
  }

  private checkExpression(guard: IExpressionGuard, input: any): { passed: boolean; actualValue: any; expectedValue: any; } {
    // 1. Kumpulkan variable dari context dan input
    const vars: Record<string, any> = {};

    for (const key of guard.context || []) {
      vars[key] = this.globalContext.get(key);
    }
    for (const key of guard.input || []) {
      vars[key] = input[key];
    }    

    // 2. Validasi keamanan
    if (!this.isSafeExpression(guard.expr)) {
      logger.error(`❌ Unsafe expression: ${guard.expr}`);
      return { 
        passed: false, 
        actualValue: 'unsafe expression', 
        expectedValue: guard.expr
      }
    }

    // 3. Eksekusi ekspresi
    try {      
      const fn = new Function(...Object.keys(vars), `return ${guard.expr}`);      
      if(!fn(...Object.values(vars))){
        return { 
          passed: false, 
          actualValue: `${Object.keys(vars).join(', ')} = ${Object.values(vars).join(', ')}`, 
          expectedValue: guard.expr
        }
      };
      return { 
        passed: true, 
        actualValue: 'expression evaluation success', 
        expectedValue: guard.expr
      }
    } catch (error) {
      error
      logger.error(`❌ Expression evaluation error: ${guard.expr}`, error);      
      return { 
        passed: false, 
        actualValue: 'expression evaluation error', 
        expectedValue: guard.expr
      }
    }
  }

  private isSafeExpression(expr: string): boolean {
    const forbidden = [
      // --- 1. Execution & Code Generation ---
      'eval', 'Function', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask',
      // --- 2. Prototype & Object Mutation (Injection Vectors) --- 'constructor', '__proto__', 'prototype', 'Object',
      'Reflect', 'Proxy', 'this', 'arguments',
      // --- 3. Global Scope & Environment Handles ---
      'global', 'globalThis', 'window', 'self', 'top', 'parent', 'frames',
      // --- 4. Node.js & Module System ---
      'process', 'require', 'import', 'export', 'module', '__dirname', '__filename', 'Buffer',
      // --- 5. Built-in Utility & Math Globals ---
      'Math', 'Date', 'JSON', 'RegExp', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'Error', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
      // --- 6. Network, I/O & Storage APIs ---
      'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'SharedWorker', 'ServiceWorker', 'navigator', 'location', 'document', 'localStorage', 'sessionStorage', 'indexedDB', 'cookieStore',
      // --- 7. Debugging & Console ---
      'console', 'debugger'
    ];
    for (const word of forbidden) {
      if (expr.includes(word)) return false;
    }
    if (expr.length > 500) return false;
    return true;
  }

  private isExpressionGuard(allowed: any): allowed is IExpressionGuard {
    return allowed && typeof allowed === 'object' && 'expr' in allowed;
  }

  // ===== EXPLORER GENERATOR (AUTO) =====
  private generateExplorer(): void {
    const isNode = typeof process !== 'undefined' && process.versions?.node;
    const isBrowser = typeof window !== 'undefined' && typeof window.open === 'function';

    // ===== NODE.JS: generate file + auto-open =====
    if (isNode) {
      try {
        const fs = require('fs');
        const path = require('path');        
        
        const explorerDir = path.join(process.cwd(), 'explorer');
        if (!fs.existsSync(explorerDir)) {
          fs.mkdirSync(explorerDir, { recursive: true });
        }

        const catalog = this.buildCatalog();
        const html = this.buildExplorerHTML(catalog);
        const indexPath = path.join(explorerDir, 'index.html');

        fs.writeFileSync(indexPath, html);
        fs.writeFileSync(path.join(explorerDir, 'catalog.json'), JSON.stringify(catalog, null, 2));

        logger.verbose(`📚 Explorer generated: ${indexPath}`);
        logger.info(`📄 Open ${indexPath} in your browser to view the 🌐 explorer.`);        

      } catch (error) {
        logger.warn(`⚠️ Failed to generate explorer (Node.js):`, error);
      }
      return;
    }

    // ===== BROWSER: virtual HTML di tab baru =====
    if (isBrowser) {
      this.openExplorerInBrowser();
      return;
    }

    logger.verbose('📚 Explorer only available in Node.js or browser environment');
  }

  private buildCatalog(): any {
    const capabilities = Array.from(this.capabilities.keys());
    const workflows = Array.from(this.workflows.keys());
    const pluginMap = new Map<string, any>();

    // ===== INISIALISASI DARI PLUGIN META =====
    for (const [name, meta] of this.pluginMeta) {
      pluginMap.set(name, {
        name,
        version: meta.version,
        description: meta.description,
        capabilities: [],
        workflows: [],
        dependencies: [] as string[]
      });
    }

    // ===== CAPABILITIES =====
    for (const capKey of capabilities) {
      const pluginName = capKey.split('/')[0];
      const capObj = this.capabilities.get(capKey);
      if (pluginMap.has(pluginName) && capObj) {
        const capData: any = {
          name: capKey,
          description: capObj.description || ''
        }
        // ===== SCHEMA =====
        if (capObj.inputSchema) {
          capData.inputSchema = capObj.inputSchema;
        }
        if (capObj.outputSchema) {
          capData.outputSchema = capObj.outputSchema;
        }
        pluginMap.get(pluginName).capabilities.push(capData);
      }
    }

    // ===== WORKFLOWS + DEPENDENCY =====
    for (const wfKey of workflows) {
      const pluginName = wfKey.split('/')[0];
      const workflow = this.workflows.get(wfKey);
      if (pluginMap.has(pluginName) && workflow) {
        const wfData: any = {
          name: wfKey,
          description: workflow.description || '',
          allowed: workflow.allowed || [],
          allowedType: this.getAllowedType(workflow.allowed),
          steps: workflow.steps || []
        };        
        if (workflow.inputSchema) {
          wfData.inputSchema = workflow.inputSchema;
        }
        if (workflow.outputSchema) {
          wfData.outputSchema = workflow.outputSchema;
        }

        pluginMap.get(pluginName).workflows.push(wfData);    

        // ===== DETECTION DEPENDENCY =====
        for (const step of workflow.steps) {
          const capPlugin = step.useCapability.split('/')[0];
          if (capPlugin !== pluginName && 
              !pluginMap.get(pluginName).dependencies.includes(capPlugin)) {
            pluginMap.get(pluginName).dependencies.push(capPlugin);
          }
        }
      }
    }

    return {
      runtime: {
        name: 'Polaris Runtime',
        version: '2.0.0.alpha.0',
        allowedContextWorkflow: this.allowedContextWorkflow
      },
      statistics: {
        totalPlugins: this.pluginMeta.size,
        totalWorkflows: workflows.length,
        totalCapabilities: capabilities.length
      },
      plugins: Array.from(pluginMap.values())
    };
  }

  private buildExplorerHTML(catalog: any): string {
    const allowedWorkflow = catalog.runtime.allowedContextWorkflow || 'None';
    const jsonString = JSON.stringify(catalog, null, 2);

    return `<!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8" /><title>Polaris Explorer</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: system-ui; background: #0b0b0b; color: #e0e0e0; display: flex; height: 100vh; }
    .sidebar { width: 240px; background: #141414; border-right: 1px solid #2a2a2a; padding: 20px; overflow-y: auto; }
    .sidebar h1 { font-size: 20px; color: #fff; }
    .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
    .nav-item { padding: 8px 12px; border-radius: 6px; cursor: pointer; color: #aaa; }
    .nav-item:hover { background: #1e1e1e; color: #fff; }
    .nav-item.active { background: #1e1e1e; color: #6c63ff; }
    .main { flex: 1; padding: 24px; overflow-y: auto; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #141414; padding: 16px 24px; border-radius: 12px; border: 1px solid #2a2a2a; flex: 1; }
    .stat-card .num { font-size: 28px; font-weight: 700; color: #fff; }
    .stat-card .label { color: #888; font-size: 13px; }
    .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .card-title { font-weight: 600; color: #fff; }
    .card-desc { color: #999; font-size: 14px; }
    .badge-allowed { background: #1a2a1a; color: #6caf7a; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
    .step { padding: 4px 0; font-size: 14px; color: #ccc; border-bottom: 1px solid #1e1e1e; }
    .step .cap { color: #6c63ff; }
    .guard { background: #1a1a2a; padding: 4px 10px; border-radius: 4px; font-size: 13px; display: inline-block; margin: 2px 4px 2px 0; border: 1px solid #2a2a3a; }
    .plugin-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap;}
    .plugin-version { background: #1a1a2a; color: #6c63ff; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid #2a2a3a; }
    .plugin-desc { color: #888; font-size: 14px; margin-top: 4px; font-style: italic; padding-bottom: 10px; }
    .plugin-dependencies { margin-top: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding-bottom: 20px; }
    .dep-label { color: #666; font-size: 12px; }
    .dep-badge { background: #1a2a3a; color: #6caf7a; padding: 2px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #2a3a4a; }
    .capability-desc { color: #888; font-size: 13px; margin-top: 2px; font-style: italic; }
    .depends-on { color: #f7d44a; font-size: 12px; margin-left: 6px; }
    details { margin-top: 8px;}
    details summary { color: #888; cursor: pointer; font-size: 13px; }
    details pre { background: #0b0b0b; padding: 12px; border-radius: 6px; font-size: 12px; margin-top: 4px; border: 1px solid #2a2a2a; color: #e0e0e0; }
    .allowed-section { margin: 8px 0; padding: 8px 12px; background: #0b0b0b; border-radius: 6px; }
    .allowed-label { color: #888; font-size: 12px; font-weight: 600; }
    .guard { background: #1a1a2a; color: #6c63ff; padding: 2px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #2a2a3a; margin: 2px 4px 2px 0; display: inline-block; }
    .expression .expr { display: block; font-family: 'Courier New', monospace; color: #f7d44a; font-size: 14px; padding: 4px 0; background: #0a0a0a; border-radius: 4px; }
    .expr-context, .expr-input { display: inline-block; color: #6caf7a; font-size: 12px; margin-right: 12px; }
  </style>
  </head>
  <body>
  <div class="sidebar">
    <h1>⚡ Polaris</h1>
    <div class="sub">Explorer</div>
    <div class="nav-item active" data-target="overview">📋 Overview</div>
    ${catalog.plugins.map((p: any) => `
      <div class="nav-item" data-target="${p.name}">📦 ${p.name}</div>
    `).join('')}
  </div>
  <div class="main" id="content"></div>
  <script>
  const data = ${jsonString};
  const content = document.getElementById('content');
  function renderOverview() {
    content.innerHTML = \`
      <h2>📊 Overview</h2>
      <div class="stats">
        <div class="stat-card"><div class="num">\${data.statistics.totalPlugins}</div><div class="label">Plugins</div></div>
        <div class="stat-card"><div class="num">\${data.statistics.totalWorkflows}</div><div class="label">Workflows</div></div>
        <div class="stat-card"><div class="num">\${data.statistics.totalCapabilities}</div><div class="label">Capabilities</div></div>
      </div>
      <div class="card"><span class="card-title">🔒 Allowed Context Workflow</span> <span class="badge-allowed">${allowedWorkflow}</span></div>
      <div class="card"><pre>${jsonString}</pre></div>
    \`;
  }
  function renderPlugin(name) {
    const plugin = data.plugins.find(p => p.name === name);
    if (!plugin) return renderOverview();
    let html = \`
      <div class="plugin-header">
        <h2>📦 \${plugin.name}</h2>
        <span class="plugin-version">v\${plugin.version}</span>
      </div>
      \${plugin.description ? \`<div class="plugin-desc">\${plugin.description}</div>\` : ''}
      \${plugin.dependencies && plugin.dependencies.length > 0 ? \`
        <div class="plugin-dependencies">
          <span class="dep-label">🔗 Depends on:</span>
          \${ plugin.dependencies.map((dep) => \`<span class="dep-badge">\${dep}</span>\`).join('') }
        </div>
      \` : ''}
    \`;
    if (plugin.capabilities?.length) {
      html += \`<h3>⚡ Capabilities</h3>\`;
      plugin.capabilities.forEach(c => { 
      html += \`<div class="card"><div class="card-title">\${c.name}</div>\${c.description ? \`<div class="capability-desc">\${c.description}</div>\` : ''}\`
      if (c.inputSchema) {
      html += \`<details><summary>📥 Input Schema</summary><pre>\${JSON.stringify(c.inputSchema, null, 2)}</pre></details>\`;
      }
      if (c.outputSchema) {
        html += \`<details><summary>📤 Output Schema</summary><pre>\${JSON.stringify(c.outputSchema, null, 2)}</pre></details>\`;
      }
      html += \`</div>\`;});
    }
    if (plugin.workflows?.length) {
      html += \`<h3>🔄 Workflows</h3>\`;
      plugin.workflows.forEach(w => {
        const isAllowed = data.runtime.allowedContextWorkflow === w.name;
        html += \`<div class="card"><div class="card-title">\${w.name} \${isAllowed ? '<span class="badge-allowed">🔒 Allowed Context</span>' : ''}</div><div class="card-desc">\${w.description}</div>\`;
        
        // Allowed
        if (w.allowed) {
          if (w.allowedType === 'array') {
            html += \`<div class="allowed-section">\`;
            html += \`<span class="allowed-label">🛡️ Allowed:</span>\`;
            html += w.allowed.map((g) => {
              const valueLabel = g.value?.key && g.value?.source 
                ? \`{\${g.value.source}.\${g.value.key}}\` 
                : JSON.stringify(g.value);
              return \`<span class="guard">\${g.source}.\${g.key} \${g.operator||'eq'} \${valueLabel}</span>\`;
            }).join(' ');
            html += \`</div>\`;
          } else if (w.allowedType === 'expression') {
            html += \`<div class="allowed-section expression">\`;
            html += \`<span class="allowed-label">🧠 Expression:</span>\`;
            html += \`<span class="expr">\${w.allowed.expr}</span>\`;
            if (w.allowed.context?.length) {
              html += \`<span class="expr-context">📥 context: \${w.allowed.context.join(', ')}</span>\`;
            }
            if (w.allowed.input?.length) {
              html += \`<span class="expr-input">📥 input: \${w.allowed.input.join(', ')}</span>\`;
            }
            html += \`</div>\`;
          } else {
            html += \`<div class="allowed-section"><span class="allowed-label">🛡️ Allowed:</span> No restrictions</div>\`;
          }
        }

        // schema
        if (w.inputSchema) {
          html += \`<details><summary>📥 Input Schema</summary><pre>\${JSON.stringify(w.inputSchema, null, 2)}</pre></details>\`;
        }
        if (w.outputSchema) {
          html += \`<details><summary>📤 Output Schema</summary><pre>\${JSON.stringify(w.outputSchema, null, 2)}</pre></details>\`;
        }

        // Steps
        html += \`<div>\${w.steps.map(s => \`<div class="step">▸ \${s.name} → <span class="cap">\${s.useCapability}</span>
        \${s.dependsOn && s.dependsOn.length > 0 ? \`<span class="depends-on">(depends on: \${s.dependsOn.join(', ')})</span>\` : ''}
        </div>\`).join('')}</div></div>\`;
      });
    }
    content.innerHTML = html;
  }
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      const target = el.dataset.target;
      if (target === 'overview') renderOverview();
      else renderPlugin(target);
    });
  });
  renderOverview();
  </script>
  </body>
  </html>`;
  }

  private getAllowedType(allowed: any): 'none' | 'array' | 'expression' {
    if (!allowed) return 'none';
    if (Array.isArray(allowed)) return 'array';
    if (allowed.expr) return 'expression';
    return 'none';
  }

  private openExplorerInBrowser(): void {
    try {
      const catalog = this.buildCatalog();
      const html = this.buildExplorerHTML(catalog);
      
      // Blob HTML
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // open tab
      window.open(url, '_blank');
      
      logger.verbose(`🌐 Explorer opened in new tab (virtual HTML)`);
    } catch (error) {
      logger.warn(`⚠️ Failed to open explorer in browser:`, error);
    }
  }
}