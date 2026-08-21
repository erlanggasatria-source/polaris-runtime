// ============================================
// POLARIS CORE TYPES
// ============================================

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
  inputSchema?: Record<string, any>;   // JSON Schema (opsional)
  outputSchema?: Record<string, any>;  // JSON Schema (opsional)
  run: (input: any, context: IContext) => any | Promise<any>;
}

export interface IWorkflow {
  name: string;
  description?: string;  
  allowed?: IAllowed;
  inputSchema?: Record<string, any>;   // JSON Schema (opsional)
  outputSchema?: Record<string, any>;  // JSON Schema (opsional)
  steps: IStep[];
}

export interface IStep {
  name: string;
  useCapability: string;
  dependsOn?: string[];
  timeout?: number;
}

export interface IAllowedGuard {
  key: string;
  value: any;
  source: 'context' | 'input';
  operator?: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte'; 
}

export interface IExpressionGuard {
  expr: string;
  context?: string[];
  input?: string[];
}
// ===== ALLOWED = array OR single expression =====
export type IAllowed = IAllowedGuard[] | IExpressionGuard;

export interface IContext {
  id: string;
  variables: Map<string, any>;
  steps: Map<string, any>;
  input: any;
  context: Map<string, any>;
}

export interface IWorkflowEvent {
  type: 'workflow_started' | 'step_started' | 'step_completed' |
        'workflow_completed' | 'workflow_failed';
  workflowPath: string;
  stepName?: string;
  stepIndex?: number;
  totalSteps?: number;
  progress?: number;
  input?: any;
  output?: any;
  error?: string;
  timestamp: number;
}

export interface IWorkflowState {
  id: string;
  workflowPath: string;
  status: 'running' | 'completed' | 'failed';
  events: IWorkflowEvent[];
  startedAt: number;
  completedAt?: number;
}

export interface IResult {
  status: 'success' | 'error';
  domain?: string;
  id?: string;
  payload?: any;
  message?: string;
  error?: string;
}

// ===== HELPERS =====
export function successResult(
  payload?: any,
  domain?: string,
  id?: string,
  message?: string
): IResult {
  return {
    status: 'success',
    domain,
    id,
    payload,
    message: message || 'Operation successful'
  };
}

export function errorResult(
  error: string,
  domain?: string,
  id?: string
): IResult {
  return {
    status: 'error',
    domain,
    id,
    error
  };
}

export function isSuccess(result: IResult): boolean {
  return result.status === 'success';
}

export function isError(result: IResult): boolean {
  return result.status === 'error';
}

export function getPayload<T = any>(result: IResult): T | undefined {
  return result.payload as T;
}

export function getError(result: IResult): string | undefined {
  return result.error;
}