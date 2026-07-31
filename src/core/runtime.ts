import { IPlugin, ICapability, IWorkflow, IContext, IWorkflowEvent, IWorkflowState, IAllowedGuard } from './types';
import { logger, LogLevel } from './logger';

export class PolarisRuntime {
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

  // ===== CONSTRUCTOR =====
  constructor(options?: { dev?: boolean }) {
    if (options?.dev) {
      logger.setLevel(LogLevel.VERBOSE);
      logger.info('🔧 Polaris Runtime initialized in DEVELOPMENT mode');
    } else {
      logger.setLevel(LogLevel.ERROR);
      logger.info('🚀 Polaris Runtime initialized in PRODUCTION mode');
    }
  }

  // ===== REGISTER =====
  register(plugins: IPlugin[]): void {
    logger.verbose(`Registering ${plugins.length} plugin(s)...`);
    for (const plugin of plugins) {
      this.registerPlugin(plugin);
    }
    logger.info(`✅ ${plugins.length} plugin(s) registered successfully`);
  }

  private registerPlugin(plugin: IPlugin): void {
    logger.verbose(`Registering plugin: ${plugin.name} v${plugin.version}`);

    try {
      const existingPlugin = this.capabilities.has(`${plugin.name}/cap-`) || 
                             this.workflows.has(`${plugin.name}/wf-`);
      
      if (existingPlugin) {
        logger.warn(`⚠️ Plugin "${plugin.name}" already registered, skipping...`);
        return;
      }

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

  // ===== EXECUTE =====
  async execute(workflowPath: string, input: any): Promise<any> {
    logger.verbose(`🚀 Executing workflow: ${workflowPath}`);
    logger.debug(`Input:`, input);

    // Idempotency check
    const idKey = this.generateIdempotencyKey(workflowPath, input);
    if (this.checkIdempotency(idKey)) {
      const error = new Error(`Duplicate workflow execution detected: ${workflowPath}`);
      logger.error(`❌ ${error.message}`);
      throw error;
    }
    this.idempotencyStore.set(idKey, Date.now());

    // Get workflow
    const workflow = this.workflows.get(workflowPath);
    if (!workflow) {
      logger.error(`❌ Workflow not found: "${workflowPath}"`);
      logger.info(`   📋 Available workflows: ${this.listWorkflows().join(', ')}`);
      throw new Error(`Workflow "${workflowPath}" not found`);
    }

    // Guard check
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

    // Build context
    const executionId = this.generateExecutionId(workflowPath);
    const context: IContext = {
      id: `ctx_${Date.now()}`,
      variables: new Map(),
      steps: new Map(),
      input,
      context: new Map(this.globalContext)
    };

    // Create state
    const state: IWorkflowState = {
      id: executionId,
      workflowPath,
      status: 'running',
      events: [],
      startedAt: Date.now()
    };
    this.states.set(executionId, state);

    // Emit workflow_started
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

        // Prepare input
        let stepInput: any;
        if (step.dependsOn && step.dependsOn.length > 0) {
          stepInput = {};
          for (const dep of step.dependsOn) {
            const depResult = context.steps.get(dep);
            if (depResult) {
              stepInput = { ...stepInput, ...depResult };
            } else {
              logger.warn(`   ⚠️ Dependency "${dep}" not found, skipping...`);
            }
          }
        } else {
          stepInput = result;
        }

        // Get capability
        const cap = this.capabilities.get(step.useCapability);
        if (!cap) {
          logger.error(`❌ Capability not found: "${step.useCapability}"`);
          logger.info(`   📋 Available capabilities: ${this.listCapabilities().join(', ')}`);
          throw new Error(`Capability "${step.useCapability}" not found`);
        }

        logger.verbose(`     ⚡ ${step.useCapability}`);
        logger.verbose(`     📝 ${cap.description || 'No description'}`);

        // Execute with timeout
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutMs = step.timeout ?? 30000;
        let stepResult: any;

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

    // Workflow completed
    state.status = 'completed';
    state.completedAt = Date.now();

    this.emitEvent(executionId, {
      type: 'workflow_completed',
      workflowPath,
      output: result,
      timestamp: Date.now()
    });

    // Allowed workflow: update global context
    if (workflowPath === this.allowedContextWorkflow) {
      const lastStepName = workflow.steps[workflow.steps.length - 1]?.name;
      const contextResult = lastStepName ? context.steps.get(lastStepName) : result;
      if (contextResult && typeof contextResult === 'object') {
        this.updateGlobalContext(contextResult);
      }
    }

    logger.info(`✅ Workflow completed: ${workflowPath}`);
    this.scheduleStateCleanup(executionId);

    return result;
  }

  // ===== EXECUTE CAPABILITY =====
  async executeCapability(capPath: string, input: any): Promise<any> {
    logger.verbose(`⚡ Executing capability: ${capPath}`);

    const cap = this.capabilities.get(capPath);
    if (!cap) {
      logger.error(`❌ Capability not found: "${capPath}"`);
      logger.info(`   📋 Available capabilities: ${this.listCapabilities().join(', ')}`);
      throw new Error(`Capability "${capPath}" not found`);
    }

    logger.debug(`📝 ${cap.description || 'No description'}`);

    try {
      const context: IContext = {
        id: `cap_${Date.now()}`,
        variables: new Map(),
        steps: new Map(),
        input,
        context: new Map(this.globalContext)
      };

      const result = await cap.run(input, context);
      logger.info(`✅ Capability executed: ${capPath}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Capability "${capPath}" failed:`, message);
      logger.debug(`   📍 Input:`, JSON.stringify(input, null, 2));
      throw error;
    }
  }

  // ===== CAN EXECUTE =====
  canExecute(workflowPath: string, input: any = {}): { allowed: boolean; reason?: string } {
    logger.verbose(`🔍 Checking permission: ${workflowPath}`);

    const workflow = this.workflows.get(workflowPath);
    if (!workflow) {
      return { allowed: false, reason: `Workflow "${workflowPath}" not found` };
    }

    if (!workflow.allowed || workflow.allowed.length === 0) {
      logger.verbose(`  ✅ No guards, allowed`);
      return { allowed: true };
    }

    for (const guard of workflow.allowed) {
      let actualValue: any;
      if (guard.source === 'context') {
        actualValue = this.globalContext.get(guard.key);
      } else {
        actualValue = input[guard.key];
      }

      const operator = guard.operator || 'eq';
      let passed = false;
      switch (operator) {
        case 'eq': passed = actualValue === guard.value; break;
        case 'neq': passed = actualValue !== guard.value; break;
        case 'in': passed = Array.isArray(guard.value) && guard.value.includes(actualValue); break;
        case 'nin': passed = Array.isArray(guard.value) && !guard.value.includes(actualValue); break;
        default: passed = false;
      }

      if (!passed) {
        const reason = `Guard failed: ${guard.source}.${guard.key} ${operator} ${guard.value} (actual: ${actualValue})`;
        logger.warn(`  ❌ ${reason}`);
        return { allowed: false, reason };
      }
    }

    logger.verbose(`  ✅ All guards passed`);
    return { allowed: true };
  }

  // ===== SUBSCRIBE =====
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

  // ===== CONTEXT =====
  setAllowedContextWorkflow(workflowPath: string): void {
    logger.verbose(`🔒 Allowed context workflow: ${workflowPath}`);
    this.allowedContextWorkflow = workflowPath;
  }

  getAllowedContextWorkflow(): string | null {
    return this.allowedContextWorkflow;
  }

  updateGlobalContext(updates: Record<string, any>): void {
    logger.verbose(`📦 Updating global context:`, updates);
    for (const [key, value] of Object.entries(updates)) {
      this.globalContext.set(key, value);
    }
    logger.info(`✅ Global context updated`);
  }

  getGlobalContext(): Map<string, any> {
    return new Map(this.globalContext);
  }

  // ===== STATE =====
  getState(executionId: string): IWorkflowState | null {
    return this.states.get(executionId) || null;
  }

  getAllStates(): IWorkflowState[] {
    return Array.from(this.states.values());
  }

  getLastState(): IWorkflowState | null {
    const states = Array.from(this.states.values());
    if (states.length === 0) return null;
    return states.reduce((a, b) => a.startedAt > b.startedAt ? a : b);
  }

  clearAllStates(): void {
    for (const [id, timer] of this.stateCleanupTimers) {
      clearTimeout(timer);
    }
    this.stateCleanupTimers.clear();
    this.states.clear();
    logger.verbose(`🧹 All states cleared`);
  }

  // ===== LIST =====
  listCapabilities(): string[] {
    return Array.from(this.capabilities.keys());
  }

  listWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }

  listPlugins(): string[] {
    const pluginNames = new Set<string>();
    for (const cap of this.capabilities.keys()) {
      const plugin = cap.split('/')[0];
      pluginNames.add(plugin);
    }
    return Array.from(pluginNames);
  }

  // ===== INTERNAL =====

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

  private checkGuard(guard: IAllowedGuard, input: any): boolean {
    let actualValue: any;
    if (guard.source === 'context') {
      actualValue = this.globalContext.get(guard.key);
    } else {
      actualValue = input[guard.key];
    }

    const operator = guard.operator || 'eq';
    switch (operator) {
      case 'eq': return actualValue === guard.value;
      case 'neq': return actualValue !== guard.value;
      case 'in': return Array.isArray(guard.value) && guard.value.includes(actualValue);
      case 'nin': return Array.isArray(guard.value) && !guard.value.includes(actualValue);
      default: return false;
    }
  }
}