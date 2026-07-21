import { IPlugin, ICapability, IWorkflow, IContext } from './types';

export class PolarisRuntime {
  private capabilities: Map<string, ICapability> = new Map();
  private workflows: Map<string, IWorkflow> = new Map();

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

  async execute(workflowPath: string, input: any): Promise<any> {
    const workflow = this.workflows.get(workflowPath);
    if (!workflow) {
      console.error(`❌ Workflow not found: "${workflowPath}"`);
      console.log(`   📋 Available workflows: ${this.listWorkflows().join(', ')}`);
      throw new Error(`Workflow "${workflowPath}" not found`);
    }

    const context: IContext = {
      id: `ctx_${Date.now()}`,
      variables: new Map(),
      input
    };

    console.log(`\n🚀 Executing: ${workflowPath}`);
    console.log(`   📝 ${workflow.description || 'No description'}`);

    let result = input;
    for (const step of workflow.steps) {
      try {
        console.log(`  ▶️  Step: ${step.name}`);

        const cap = this.capabilities.get(step.useCapability);
        if (!cap) {
          console.error(`❌ Capability not found: "${step.useCapability}"`);
          console.log(`   📋 Available capabilities: ${this.listCapabilities().join(', ')}`);
          throw new Error(`Capability "${step.useCapability}" not found`);
        }

        console.log(`     ⚡ ${step.useCapability}`);
        console.log(`     📝 ${cap.description || 'No description'}`);

        result = await cap.run(result, context);
        context.variables.set(step.name, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Step "${step.name}" failed:`, message);
        console.log(`   📍 Workflow: ${workflowPath}`);
        console.log(`   📍 Input:`, JSON.stringify(input, null, 2));
        throw error;
      }
    }

    console.log(`✅ Workflow completed: ${workflowPath}`);
    return result;
  }

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
        input
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

  listCapabilities(): string[] {
    return Array.from(this.capabilities.keys());
  }

  listWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }
}