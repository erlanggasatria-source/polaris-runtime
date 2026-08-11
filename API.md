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

## 📄 Draft: Data Flow & Context in Workflows

Understanding input, payload, and context in Capabilities

When writing capabilities, you have access to three main sources of data:

| Source	| Description	| When to use |
| --- | --- | --- |
| context.input	| The original input passed to runtime.execute(workflowPath, input). This object is immutable and lives for the entire workflow execution.  | Use for data that comes directly from the UI (e.g., form values, IDs) and should not be modified by intermediate steps. |
input.payload | The output of the previous step. In a workflow, each step receives the result of the previous step as its input (natural pipeline). If dependsOn is used, payload contains the merged output of the specified steps.  | Use for data that flows from one step to another (e.g., a meeting object fetched from the repository, then validated, then updated).  |
| context.context | The global context (Map) set by the allowed workflow (e.g., workspace/wf-set-context). This contains user info, role, workspace, etc. | Use for global, read-only data that applies to the entire session (e.g., userId, role, workspaceId).  |

Example: A Typical Capability

```typescript

// Step 1: Get meeting from repository
// This step's output will be the payload for the next step.
{
  name: 'get-meeting',
  useCapability: 'repo/cap-get',
  // input: { id: 'MET-xxx', domain: 'meetings' } → from UI
}

// Step 2: Validate and update
{
  name: 'validate-submit',
  useCapability: 'meeting/cap-validate-submit',
  dependsOn: ['get-meeting']
  // input.payload = result of step 1 (the meeting object)
  // context.input = original UI input (still available)
  // context.context = global user/role data
}
```

```typescript

// Inside the capability
run: (input, context) => {
  // 1. Get the meeting from the previous step
  const meeting = input.payload; // output from 'get-meeting'

  // 2. Get the original UI input (e.g., reason, note)
  const reason = context.input.reason; // from the original execute() call

  // 3. Get global user data
  const userId = context.context.get('userId');
  const role = context.context.get('role');

  // 4. Validate and mutate
  if (meeting.status !== 'draft') {
    throw new Error(`Invalid status: ${meeting.status}`);
  }
  if (meeting.createdBy !== userId) {
    throw new Error('Only creator can do this');
  }

  // 5. Return a new payload for the next step
  return successResult({
    domain: 'meetings',
    id: meeting.id,
    data: { status: 'waiting_approval', log: ... }
  });
}
```

### Best Practices

    Never mutate context.input – treat it as read-only.

    Use input.payload to access data from previous steps.

    Use context.context for global, session-level data (user, role, workspace).

    Return { domain, id, data } for repository operations (so the next step can directly call repo/cap-update).

    Throw errors for validation failures (workflow stops immediately).

### Summary

    context.input = original UI input (immutable)

    input.payload = output of the previous step (mutable)

    context.context = global session data (read-only)

Design your capabilities to be pure transformers: take input.payload, validate with context.context and context.input, and return a new payload for the next step. This keeps your workflows clean, testable, and maintainable.

---

## Global Context: Setting and Updating

Global context holds session-wide data (e.g., user ID, role, workspace) that is available to every workflow via context.context. It is managed through a special allowed workflow that is registered with the runtime.

### 1. Define the Allowed Workflow

In your plugin, create a workflow that updates the global context. This workflow must be allowed to modify the context (only one workflow can do this).

```typescript
// workspace.plugin.ts
export const WorkspacePlugin: IPlugin = {
  name: 'workspace',
  capabilities: [
    {
      name: 'workspace/cap-set-context',
      description: 'Set global context (key-value pairs)',
      run: (input) => {
        // Return the new context as payload
        return successResult(input, 'workspace', undefined, 'Context updated');
        // successResult(payload,domain?,id?,message?)
      }
    }
  ],
  workflows: [
    {
      name: 'workspace/wf-set-context',
      description: '🔒 ALLOWED: Set global context',
      allowed: [], // No restrictions (it's the allowed workflow)
      steps: [
        { name: 'SetContext', useCapability: 'workspace/cap-set-context' }
      ]
    }
  ]
};
```

### 2. Register the Allowed Workflow in Runtime

After registering your plugins, tell the runtime which workflow is allowed to update the global context.

```typescript
// App.tsx or main entry
runtime.register([WorkspacePlugin, /* other plugins */]);
runtime.setAllowedContextWorkflow('workspace/wf-set-context');
```

### 3. Execute the Workflow to Change Context

Whenever you need to change the global context (e.g., user login, workspace switch), execute the allowed workflow with the new data.

```typescript
// Switch user or workspace
await runtime.execute('workspace/wf-set-context', {
  userId: 'user-001',
  role: 'admin',
  workspaceId: 'ws-001',
  name: 'John Doe'
});
```

After this call, every subsequent workflow will have access to these values via context.context.get('userId'), context.context.get('role'), etc.

### 4. Access Context in Any Capability
typescript

run: (input, context) => {
  const userId = context.context.get('userId');
  const role = context.context.get('role');
  // ... use userId and role for validation
}

### 5. Important Notes

    Only one workflow can be designated as the context-setter (via setAllowedContextWorkflow).

    The context is stored as a Map<string, any> and is available globally.

    The allowed workflow must exist and be registered before calling setAllowedContextWorkflow.

    Changing context does not affect already-running workflows; it only applies to new executions.

### Summary

| Step  | Action  |
| --- | --- |
| 1 | Create a workflow with a capability that returns the new context as payload.  |
| 2 | Register the plugin and call runtime.setAllowedContextWorkflow('workflow/path').  |
| 3	| Execute that workflow with the new context data whenever needed.  |
| 4	| Access the context in any capability using context.context.get('key').  |

This pattern ensures that global state changes are explicit, auditable, and controlled by business logic (workflows).

---

## License

MIT © Polaris Team

---
---