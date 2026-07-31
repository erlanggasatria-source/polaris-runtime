// ============================================
// TYPES
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
  run: (input: any, context: IContext) => any | Promise<any>;
}

export interface IWorkflow {
  name: string;
  description?: string;
  allowed?: IAllowedGuard[]; // ← TAMBAHAN!
  steps: IStep[];
}

export interface IStep {
  name: string;
  useCapability: string;
  dependsOn?: string[];
  timeout?: number; // dalam milidetik, 0 = tanpa timeout
}

// ===== GUARD =====
export interface IAllowedGuard {
  key: string;          // 'role' atau 'status'
  value: any;           // 'TREASURER' atau 'WAITING_APPROVAL'
  source: 'context' | 'input'; // Dari mana ambil?
  operator?: 'eq' | 'neq' | 'in' | 'nin'; // Optional
}

// ===== CONTEXT =====
export interface IContext {
  id: string;
  variables: Map<string, any>;
  steps: Map<string, any>;
  input: any;
  context: Map<string, any>; // ← GLOBAL CONTEXT (Map!)
}

// ===== CONTEXT HELPERS =====
export type ContextValue = any;
export type ContextKey = string;

// ===== EVENT =====
export interface IWorkflowEvent {
  type: 'workflow_started' | 'step_started' | 'step_completed' | 
        'workflow_completed' | 'workflow_failed';
  workflowPath: string;
  stepName?: string;
  stepIndex?: number;      // ← TAMBAHAN
  totalSteps?: number;     // ← TAMBAHAN
  progress?: number;       // ← TAMBAHAN (persentase)
  input?: any;
  output?: any;
  error?: string;
  timestamp: number;
}

export interface IWorkflowState {
  id: string; // executionId
  workflowPath: string;
  status: 'running' | 'completed' | 'failed';
  events: IWorkflowEvent[];
  startedAt: number;
  completedAt?: number;
}

export type EventCallback = (event: IWorkflowEvent) => void;

// ============================================
// KONTRAK RESULT STEP
// ============================================

export interface IResult {
  status: 'success' | 'error';
  domain?: string;
  id?: string;
  payload?: any;
  message?: string;
  error?: string;
}

// ============================================
// FACTORY
// ============================================

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

// ===== UTILITY =====
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