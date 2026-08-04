# Polaris Runtime API Reference

---

## PolarisRuntime

The main runtime class.

### `constructor(options?: { dev?: boolean })`

Creates a new runtime instance.

```typescript
const runtime = new PolarisRuntime();              // production (silent)
const runtime = new PolarisRuntime({ dev: true }); // development (verbose)

register(plugins: IPlugin[]): void
```

Registers one or more plugins.
```typescript

runtime.register([MeetingPlugin, WorkspacePlugin]);
```
---
### `execute(workflowPath: string, input: any): Promise<any>`

Executes a workflow by its path.
```typescript

const result = await runtime.execute('meeting/wf-list', {});
```
---
### `canExecute(workflowPath: string, input?: any): { allowed: boolean; reason?: string }`

Checks if a workflow can be executed with the given input.
```typescript

const { allowed, reason } = runtime.canExecute('meeting/wf-approve', { status: 'draft' });
```
---

### subscribe(workflowPath: string, callback: (event: IWorkflowEvent) => void): () => void

Subscribes to events from a specific workflow.
```typescript

const unsubscribe = runtime.subscribe('meeting/wf-create', (event) => {
  console.log(event.type, event);
});
```
---
### `subscribeAll(callback: (event: IWorkflowEvent) => void): () => void`

Subscribes to all workflow events.
```typescript

const unsubscribe = runtime.subscribeAll((event) => {
  console.log('📡', event.type, event);
});
```
---

### `setAllowedContextWorkflow(workflowPath: string): void`

Sets the workflow that can update global context.
```typescript

runtime.setAllowedContextWorkflow('workspace/wf-set-context');
```
---

### `getAllowedContextWorkflow(): string | null`

Returns the allowed context workflow path.

---

### `getGlobalContext(): Map<string, any>`

Returns a copy of the global context.

---

## Types

### IPlugin

```typescript

interface IPlugin {
  name: string;
  version: string;
  description?: string;
  capabilities?: ICapability[];
  workflows?: IWorkflow[];
}
```

---

### ICapability
```typescript

interface ICapability {
  name: string;
  description?: string;
  run: (input: any, context: IContext) => any | Promise<any>;
}
```
---

### IWorkflow
```typescript

interface IWorkflow {
  name: string;
  description?: string;
  allowed?: IAllowedGuard[];
  steps: IStep[];
}
```
---

### IStep
```typescript

interface IStep {
  name: string;
  useCapability: string;
  dependsOn?: string[];
  timeout?: number;
}
```
---

### IAllowedGuard
```typescript

interface IAllowedGuard {
  key: string;
  value: any;
  source: 'context' | 'input';
  operator?: 'eq' | 'neq' | 'in' | 'nin';
}
```
---

### IWorkflowEvent
```typescript

interface IWorkflowEvent {
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
```
---

### IResult (Helper)
```typescript

interface IResult {
  status: 'success' | 'error';
  domain?: string;
  id?: string;
  payload?: any;
  message?: string;
  error?: string;
}
```
---

### Helpers
```typescript

successResult(payload, domain, id, message): IResult
errorResult(error, domain, id): IResult
isSuccess(result): boolean
isError(result): boolean
getPayload<T>(result): T | undefined
getError(result): string | undefined
```
---

### Logger
```typescript

import { logger, LogLevel } from '@polaris/runtime';

logger.setLevel(LogLevel.VERBOSE);
logger.info('Hello');
logger.warn('Warning');
logger.error('Error');
```
---

## License

MIT © Polaris Team

---
---