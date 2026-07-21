import { IPlugin, ICapability, IWorkflow, IContext, IAllowedGuard } from './types';

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

  // ===== EXECUTE =====
  async execute(workflowPath: string, input: any): Promise<any> {
    const workflow = this.workflows.get(workflowPath);
    if (!workflow) {
      console.error(`❌ Workflow not found: "${workflowPath}"`);
      console.log(`   📋 Available workflows: ${this.listWorkflows().join(', ')}`);
      throw new Error(`Workflow "${workflowPath}" not found`);
    }

    // ===== CHECK GUARD =====
    if (workflow.allowed && workflow.allowed.length > 0) {
      console.log(`\n🛡️ Checking guards for: ${workflowPath}`);
      let allPassed = true;
      for (const guard of workflow.allowed) {
        const passed = this.checkGuard(guard, input);
        console.log(`   ${guard.source}.${guard.key} ${guard.operator || 'eq'} ${guard.value} → ${passed ? '✅' : '❌'}`);
        if (!passed) {
          allPassed = false;
          break;
        }
      }

      if (!allPassed) {
        console.error(`❌ Workflow "${workflowPath}" not allowed to execute`);
        throw new Error(`Workflow "${workflowPath}" not allowed to execute`);
      }
    }

    // ===== BUILD CONTEXT =====
    const context: IContext = {
      id: `ctx_${Date.now()}`,
      variables: new Map(),
      steps: new Map(),
      input,
      context: new Map(this.globalContext) // ← COPY global context!
    };

    console.log(`\n🚀 Executing: ${workflowPath}`);
    console.log(`   📝 ${workflow.description || 'No description'}`);
    console.log(`   📦 Global context:`, Object.fromEntries(this.globalContext));

    let result = input;

    for (const step of workflow.steps) {
      try {
        console.log(`  ▶️  Step: ${step.name}`);

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

        const cap = this.capabilities.get(step.useCapability);
        if (!cap) {
          console.error(`❌ Capability not found: "${step.useCapability}"`);
          console.log(`   📋 Available capabilities: ${this.listCapabilities().join(', ')}`);
          throw new Error(`Capability "${step.useCapability}" not found`);
        }

        console.log(`     ⚡ ${step.useCapability}`);
        console.log(`     📝 ${cap.description || 'No description'}`);

        result = await cap.run(stepInput, context);
        context.steps.set(step.name, result);
        console.log(context);

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Step "${step.name}" failed:`, message);
        console.log(`   📍 Workflow: ${workflowPath}`);
        console.log(`   📍 Input:`, JSON.stringify(input, null, 2));
        throw error;
      }
    }

    // ===== ALLOWED WORKFLOW: UPDATE GLOBAL CONTEXT =====
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
}