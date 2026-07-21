export interface IPlugin {
  name: string;
  version: string;
  description?: string;
  capabilities?: ICapability[];
  workflows?: IWorkflow[];
}

export interface ICapability {
  name: string;
  description?: string;
  run: (input: any, context: IContext) => any | Promise<any>;
}

export interface IWorkflow {
  name: string;
  description?: string;
  steps: IStep[];
}

export interface IStep {
  name: string;
  useCapability: string;
  dependsOn?: string[];
}

export interface IContext {
  id: string;
  variables: Map<string, any>;
  input: any;
}