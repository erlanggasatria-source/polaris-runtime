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