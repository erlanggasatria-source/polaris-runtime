import { IPlugin, ICapability, IWorkflow, IContext, IAllowedGuard, IWorkflowState, IWorkflowEvent, EventCallback } from './types';

export class PolarisRuntime {
  private capabilities: Map<string, ICapability> = new Map();
  private workflows: Map<string, IWorkflow> = new Map();
  
  // ===== GLOBAL CONTEXT =====
  private globalContext: Map<string, any> = new Map();
  
  // ===== ALLOWED WORKFLOW =====
  private allowedContextWorkflow: string | null = null;

  // ===== SET ALLOWED WORKFLOW =====
  setAllowedContextWorkflow(workflowPath: string): void {
    this.allowedContextWorkflow = workflowPath;
    console.log(`🔒 Allowed context workflow: ${workflowPath}`);
  }

  getAllowedContextWorkflow(): string | null {
    return this.allowedContextWorkflow;
  }

  // ===== UPDATE GLOBAL CONTEXT =====
  private updateGlobalContext(updates: Record<string, any>): void {
    for (const [key, value] of Object.entries(updates)) {
      this.globalContext.set(key, value);
    }
    console.log('✅ Global context updated:', Object.fromEntries(this.globalContext));
  }

  // ===== IDEMPOTENCY =====

  private idempotencyStore: Map<string, number> = new Map();
  private readonly IDEMPOTENCY_TTL = 30000; // 30 detik

  // ===== GENERATE KEY =====
  private generateIdempotencyKey(workflowPath: string, input: any): string {
    const inputString = JSON.stringify(input);
    return `${workflowPath}:${inputString}`;
  }

  // ===== CHECK & CLEANUP =====
  private checkIdempotency(key: string): boolean {
    // Hapus key yang sudah expired
    const now = Date.now();
    for (const [k, timestamp] of this.idempotencyStore) {
      if (now - timestamp > this.IDEMPOTENCY_TTL) {
        this.idempotencyStore.delete(k);
      }
    }
    return this.idempotencyStore.has(key);
  }

  // ===== REGISTER =====
  register(plugins: IPlugin[]): void {
    for (const plugin of plugins) {
      this.registerPlugin(plugin);
    }
  }

  private registerPlugin(plugin: IPlugin): void {
    try {
      const existingPlugin = this.capabilities.has(`${plugin.name}/cap-`) || 
                             this.workflows.has(`${plugin.name}/wf-`);
      
      if (existingPlugin) {
        console.warn(`⚠️ Plugin "${plugin.name}" already registered, skipping...`);
        return;
      }

      if (plugin.capabilities) {
        for (const cap of plugin.capabilities) {
          if (this.capabilities.has(cap.name)) {
            throw new Error(`Capability "${cap.name}" already registered`);
          }
          this.capabilities.set(cap.name, cap);
          console.log(`  ⚡ ${cap.name}`);
        }
      }

      if (plugin.workflows) {
        for (const wf of plugin.workflows) {
          if (this.workflows.has(wf.name)) {
            throw new Error(`Workflow "${wf.name}" already registered`);
          }
          this.workflows.set(wf.name, wf);
          console.log(`  🔄 ${wf.name}`);
        }
      }

      console.log(`✅ Plugin registered: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to register plugin "${plugin.name}":`, message);
      throw error;
    }
  }

  // ===== CHECK GUARD =====
  private checkGuard(guard: IAllowedGuard, input: any): boolean {
    let actualValue: any;

    if (guard.source === 'context') {
      actualValue = this.globalContext.get(guard.key);
    } else { // input
      actualValue = input[guard.key];
    }

    const operator = guard.operator || 'eq';

    switch (operator) {
      case 'eq':
        return actualValue === guard.value;
      case 'neq':
        return actualValue !== guard.value;
      case 'in':
        return Array.isArray(guard.value) && guard.value.includes(actualValue);
      case 'nin':
        return Array.isArray(guard.value) && !guard.value.includes(actualValue);
      default:
        return false;
    }
  }

  // ===== MULTI-WORKFLOW STATE =====
  private states: Map<string, IWorkflowState> = new Map();
  private stateCleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly STATE_TTL = 30000; // 30 detik

  // ===== GENERATE EXECUTION ID =====
  private generateExecutionId(workflowPath: string): string {
    const random = Math.random().toString(36).substring(2, 8);
    return `${workflowPath}:${Date.now()}:${random}`;
  }
  // ===== EMIT EVENT =====
  private emitEvent(executionId: string, event: IWorkflowEvent): void {
    const state = this.states.get(executionId);
    if (state) {
      state.events.push(event);
    }
    // Kirim ke subscriber yang sesuai
    const callbacks = this.subscribers.get(event.workflowPath) || [];
    for (const cb of callbacks) {
      cb(event);
    }
  }

  getAllStates(): IWorkflowState[] {
    return Array.from(this.states.values());
  }

  getLastState(): IWorkflowState | null {
    // Return state yang paling baru (completed atau running)
    const states = Array.from(this.states.values());
    if (states.length === 0) return null;
    return states.reduce((a, b) => a.startedAt > b.startedAt ? a : b);
  }

  // ===== CLEAR ALL STATES =====
  clearAllStates(): void {
    // Hapus semua timer
    for (const [id, timer] of this.stateCleanupTimers) {
      clearTimeout(timer);
    }
    this.stateCleanupTimers.clear();
    this.states.clear();
    console.log('🧹 All states cleared');
  }

  // ===== SCHEDULE CLEANUP =====
  private scheduleStateCleanup(executionId: string): void {
    // Hapus timer sebelumnya jika ada
    const existingTimer = this.stateCleanupTimers.get(executionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.stateCleanupTimers.delete(executionId);
    }

    const timer = setTimeout(() => {
      this.states.delete(executionId);
      this.stateCleanupTimers.delete(executionId);
      console.log(`🧹 State cleaned up: ${executionId}`);
    }, this.STATE_TTL);

    this.stateCleanupTimers.set(executionId, timer);
  }

  // ===== EXECUTE =====
  async execute(workflowPath: string, input: any): Promise<any> {
  const workflow = this.workflows.get(workflowPath);
  if (!workflow) {
    console.error(`❌ Workflow not found: "${workflowPath}"`);
    console.log(`   📋 Available workflows: ${this.listWorkflows().join(', ')}`);
    throw new Error(`Workflow "${workflowPath}" not found`);
  }

  // ==== IDEMPOTENCY GUARD ====
  const idKey = this.generateIdempotencyKey(workflowPath, input);
  if (this.checkIdempotency(idKey)) {
    const error = new Error(`Duplicate workflow execution detected: ${workflowPath}`);
    console.error(`❌ ${error.message}`);
    throw error;
  }
  this.idempotencyStore.set(idKey, Date.now());

  // ===== GUARD =====
  if (workflow.allowed && workflow.allowed.length > 0) {
    console.log(`\n🛡️ Checking guards for: ${workflowPath}`);
    for (const guard of workflow.allowed) {
      const passed = this.checkGuard(guard, input);
      console.log(`   ${guard.source}.${guard.key} ${guard.operator || 'eq'} ${guard.value} → ${passed ? '✅' : '❌'}`);
      if (!passed) {
        console.error(`❌ Workflow "${workflowPath}" not allowed to execute`);
        throw new Error(`Workflow "${workflowPath}" not allowed to execute`);
      }
    }
  }

  // ===== CONTEXT =====
  const context: IContext = {
    id: `ctx_${Date.now()}`,
    variables: new Map(),
    steps: new Map(),
    input,
    context: new Map(this.globalContext)
  };

  console.log(`\n🚀 Executing: ${workflowPath}`);
  console.log(`   📝 ${workflow.description || 'No description'}`);
  console.log(`   📦 Global context:`, Object.fromEntries(this.globalContext));

  let result = input;
  // ===== PROGRESS =====
  const executionId = this.generateExecutionId(workflowPath);
  const totalSteps = workflow.steps.length;
  
  // 1. Set state
  const state: IWorkflowState = {
    id: executionId,
    workflowPath,
    status: 'running',
    events: [],
    startedAt: Date.now()
  };

  this.states.set(executionId, state);

  // 2. Emit workflow_started
  this.emitEvent(executionId, {
    type: 'workflow_started',
    workflowPath,
    input,
    timestamp: Date.now()
  });

  for (const step of workflow.steps) {
    try {
      console.log(`  ▶️  Step: ${step.name}`);

      // ===== PREPARE INPUT =====
      let stepInput: any;
      if (step.dependsOn && step.dependsOn.length > 0) {
        stepInput = {};
        for (const dep of step.dependsOn) {
          const depResult = context.steps.get(dep);
          if (depResult) {
            stepInput = { ...stepInput, ...depResult };
          }
        }
      } else {
        stepInput = result;
      }

      // ===== GET CAPABILITY =====
      const cap = this.capabilities.get(step.useCapability);
      if (!cap) {
        console.error(`❌ Capability not found: "${step.useCapability}"`);
        console.log(`   📋 Available capabilities: ${this.listCapabilities().join(', ')}`);
        throw new Error(`Capability "${step.useCapability}" not found`);
      }

      console.log(`     ⚡ ${step.useCapability}`);
      console.log(`     📝 ${cap.description || 'No description'}`);

      // ===== TIMEOUT =====
      const timeoutMs = step.timeout ?? 30000; // default 30 detik

      let stepResult: any;

      // progress
      const stepIndex = workflow.steps.indexOf(step);
      const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);
      // 3. Di setiap step:
      this.emitEvent(executionId, {
      type: 'step_started',
      workflowPath,
      stepName: step.name,
      stepIndex: stepIndex + 1,  // 1-based untuk user
      totalSteps,
      progress,
      timestamp: Date.now()
    });

      if (timeoutMs === 0) {
        // Tanpa timeout
        stepResult = await cap.run(stepInput, context);
      } else {
        // Dengan timeout
        stepResult = await Promise.race([
          cap.run(stepInput, context),
          new Promise<never>((_, reject) =>
            setTimeout(() => {
              reject(new Error(`⏰ Step "${step.name}" timeout after ${timeoutMs}ms`));
            }, timeoutMs)
          )
        ]);
      }

      result = stepResult;
      context.steps.set(step.name, result);

      // Setelah step selesai:
      this.emitEvent(executionId, {
        type: 'step_completed',
        workflowPath,
        stepName: step.name,
        output: result,
        timestamp: Date.now()
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Step "${step.name}" failed:`, message);
      console.log(`   📍 Workflow: ${workflowPath}`);
      console.log(`   📍 Input:`, JSON.stringify(input, null, 2));

      if (message.includes('timeout')) {
        console.log(`   💡 Tip: Increase timeout or check capability performance`);
      }

      // 5. Di error:
      state.status = 'completed';
      state.completedAt = Date.now();
      this.emitEvent(executionId, {
        type: 'workflow_failed',
        workflowPath,
        error: message,
        timestamp: Date.now()
      });

      // Setelah workflow selesai (success atau failed), mulai timer cleanup
      this.scheduleStateCleanup(executionId);
      throw error;
    }

    // 4. Di akhir (success):
    state.status = 'completed';
    state.completedAt = Date.now();
    this.emitEvent(executionId, {
      type: 'workflow_completed',
      workflowPath,
      output: result,
      timestamp: Date.now()
    });
        
    // Setelah workflow selesai (success atau failed), mulai timer cleanup
    this.scheduleStateCleanup(executionId);
  }

  // ===== ALLOWED WORKFLOW =====
  if (workflowPath === this.allowedContextWorkflow) {
    const lastStepName = workflow.steps[workflow.steps.length - 1]?.name;
    const contextResult = lastStepName ? context.steps.get(lastStepName) : result;
    if (contextResult && typeof contextResult === 'object') {
      this.updateGlobalContext(contextResult);
    }
  }

  console.log(`✅ Workflow completed: ${workflowPath}`);
  return result;
}

  // ===== EXECUTE CAPABILITY =====
  async executeCapability(capPath: string, input: any): Promise<any> {
    const cap = this.capabilities.get(capPath);
    if (!cap) {
      console.error(`❌ Capability not found: "${capPath}"`);
      console.log(`   📋 Available capabilities: ${this.listCapabilities().join(', ')}`);
      throw new Error(`Capability "${capPath}" not found`);
    }

    console.log(`\n⚡ Executing: ${capPath}`);
    console.log(`   📝 ${cap.description || 'No description'}`);

    try {
      const context: IContext = {
        id: `cap_${Date.now()}`,
        variables: new Map(),
        steps: new Map(),
        input,
        context: new Map(this.globalContext)
      };

      const result = await cap.run(input, context);
      console.log(`✅ Capability executed: ${capPath}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Capability "${capPath}" failed:`, message);
      console.log(`   📍 Input:`, JSON.stringify(input, null, 2));
      throw error;
    }
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

  getGlobalContext(): Map<string, any> {
    return this.globalContext;
  }

  // ===== TIMEOUT HELPER =====
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    stepName: string
  ): Promise<T> {
    if (timeoutMs === 0) {
      // Tanpa timeout
      return await fn();
    }

    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => {
          reject(new Error(`⏰ Step "${stepName}" timeout after ${timeoutMs}ms`));
        }, timeoutMs)
      )
    ]);
  }

  // ===== RUNTIME: Subscribe by Workflow Path =====
  private subscribers: Map<string, EventCallback[]> = new Map();

  // Subscribe ke workflow tertentu
  subscribe(workflowPath: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(workflowPath)) {
      this.subscribers.set(workflowPath, []);
    }
    this.subscribers.get(workflowPath)!.push(callback);
    
    return () => {
      const callbacks = this.subscribers.get(workflowPath);
      if (callbacks) {
        this.subscribers.set(workflowPath, callbacks.filter(cb => cb !== callback));
      }
    };
  }
  
  // ===== CAN EXECUTE =====
  canExecute(workflowPath: string, input: any = {}): { allowed: boolean; reason?: string } {
    const workflow = this.workflows.get(workflowPath);
    if (!workflow) {
      return { allowed: false, reason: `Workflow "${workflowPath}" not found` };
    }

    if (!workflow.allowed || workflow.allowed.length === 0) {
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
        return {
          allowed: false,
          reason: `Guard failed: ${guard.source}.${guard.key} ${operator} ${guard.value} (actual: ${actualValue})`
        };
      }
    }

    return { allowed: true };
  }
}