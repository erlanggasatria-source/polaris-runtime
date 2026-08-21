# Polaris Runtime

> **Runtime explain himself with auto explorer app as documentary**  
> Build business applications as executable workflows.

Polaris Runtime is an execution engine for business workflows.  
It is **not** an application framework, **not** a UI framework, and **not** a backend framework.  
Its only responsibility is to execute business workflows declared by plugins.

---

## 🧠 Philosophy

> *"@polaris/runtime are self describing runtime which grammar first before the code. The bottleneck speed writing code now has been reduce, understand is."*

**Polaris is a self-describing runtime** designed to make onboarding easy for both **programmers** and **LLMs**.

### How It Works

1. **Grammar First** — Define business logic using a clear, human-readable grammar (Plugins, Workflows, Capabilities)
2. **Self-Describing** — Explorer auto-generates documentation from the grammar itself
3. **Same Language** — Both humans and LLMs understand the same structure

### Separation of Concerns

- **Business Logic** → Lives in workflows and capabilities, its **your agnostic asset**
- **Presentation** → UI only triggers workflows and renders projections
- **Runtime** → Executes workflows and manages state

### AI-Native Development

**"LLM build app code with speed of light, programmer audit and understand a whole structure's with explorer before look any code because LLM and human using same grammar."**

| Role | Responsibility |
|------|----------------|
| **LLM** | Generate code at speed of light |
| **Programmer** | Audit, understand, and guide the structure |
| **Explorer** | Bridge between LLM and human using the same grammar |

### Why This Matters

- ✅ **No more "what does this code do?"** — Explorer shows you
- ✅ **LLM and Human speak the same language** — Grammar is the contract
- ✅ **Onboarding is instant** — Understand the whole system before reading a single line of code
- ✅ **Speed without chaos** — LLM writes fast, Explorer keeps it understandable

---
## 📚 Documentation

- [Architecture](https://github.com/erlanggasatria-source/polaris-runtime/blob/main/ARCHITECTURE.md) — Design principles and core concepts
- [API Reference](https://github.com/erlanggasatria-source/polaris-runtime/blob/main/API.md) — Public API documentation
- [Changelog](https://github.com/erlanggasatria-source/polaris-runtime/blob/main/CHANGELOG.md) — Version history
- [Contributing](https://github.com/erlanggasatria-source/polaris-runtime/blob/main/CONTRIBUTING.md) — How to contribute

---

## 📦 Installation

### From npm

```bash
npm install @polaris-runtime/core
```

### From GitHub

```bash
git clone https://github.com/erlanggasatria-source/polaris-runtime.git
cd polaris-runtime
npm install
npm run build
```

Then in your project:
```json
{
  "dependencies": {
    "@polaris-runtime/core": "file:../polaris-runtime"
  }
}
```

---

## 🚀 Quick Start
```typescript
import { PolarisRuntime } from '@polaris-runtime/core';
import { MeetingPlugin } from './plugins/meeting.plugin';

const runtime = new PolarisRuntime();

// Register plugins
runtime.register([MeetingPlugin]);

// Execute workflow
const result = await runtime.execute('meeting/wf-list', {});
```
---

## 🔧 Development vs Production
```typescript

// Development — verbose logging + auto-explorer
import { PolarisRuntime } from '@polaris-runtime/core/dev';

// Production — silent (errors only)
import { PolarisRuntime } from '@polarisruntime/core';
```
---

## 🧩 Core Concepts
| Concept	    | Description                           |
| ---           | ---                                   |
| Plugin	    | Self-contained business module        |
| Capability	| Smallest executable business unit     |
| Workflow	    | Business process composed of steps    |
| Step	        | Executes exactly one capability       |
| Context	    | Carries data between steps            |
| Allowed       | Defines who can execute a workflow    |
| Schema  | Input/output contract for capabilities and workflows  |
---

## 🧩 Example Plugin with Timeout & Allowed Rule

Here's a complete example of a plugin that demonstrates both **timeout** and **allowed** rules.

```typescript
// plugins/report.plugin.ts
import { IPlugin } from '@polaris/runtime';

export const ReportPlugin: IPlugin = {
  name: 'report',
  version: '1.0.0',
  description: 'Report generation with timeout and permission guard',

  capabilities: [
    {
      name: 'report/cap-generate',
      description: 'Generate a heavy report (may take time)',
      run: async (input) => {
        // Simulate heavy processing
        await new Promise(resolve => setTimeout(resolve, 5000));
        return {
          id: `rpt-${Date.now()}`,
          title: input.title,
          pages: 42,
          status: 'generated'
        };
      }
    },
    {
      name: 'report/cap-validate',
      description: 'Validate report input',
      run: (input) => {
        if (!input.title || input.title.trim() === '') {
          throw new Error('Report title is required');
        }
        return { valid: true, data: input };
      }
    }
  ],

  workflows: [
    {
      name: 'report/wf-generate',
      description: 'Generate a report with timeout protection',
      
      // ===== ALLOWED RULE: Only 'admin' can generate reports =====
      allowed: [
        { 
          key: 'role', 
          value: 'admin', 
          source: 'context',
          operator: 'eq'
        }
      ],
      
      steps: [
        { 
          name: 'Validate', 
          useCapability: 'report/cap-validate' 
        },
        { 
          name: 'GenerateReport', 
          useCapability: 'report/cap-generate',
          dependsOn: ['Validate'],
          
          // ===== TIMEOUT: 10 seconds (overrides default 30s) =====
          timeout: 10000
        }
      ]
    }
  ]
};
```

## 🧩 Example Plugin with Schema

```typescript
// plugins/meeting.plugin.ts
import { IPlugin } from '@polaris-runtime/core';

export const MeetingPlugin: IPlugin = {
  name: 'meeting',
  version: '1.0.0',
  description: 'Meeting management',
  capabilities: [
    {
      name: 'meeting/cap-create',
      description: 'Create a new meeting',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Meeting title' },
          date: { type: 'string', format: 'date' },
          agenda: { type: 'string', description: 'One per line' }
        },
        required: ['title', 'date']
      },
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string' }
        }
      },
      run: (input) => {
        // ... implementation
        return { id: 'meet-001', status: 'draft' };
      }
    }
  ],
  workflows: [
    {
      name: 'meeting/wf-create',
      description: 'Generate a report with timeout protection',      
      allowed: [ { key: 'role', value: 'admin', source: 'context', operator: 'eq' }],
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Meeting title' },
          date: { type: 'string', format: 'date' },
          agenda: { type: 'string', description: 'One per line' }
        },
        required: ['title', 'date']
      },
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string' }
        }
      },
      steps: [{ name: 'create', useCapability: 'meeting/cap-create' }]
    }
  ],
  
};
```

---

### ⏱️ Timeout Management

Each step can have a timeout to prevent workflows from hanging indefinitely.
Default Timeout

If not specified, each step has a default timeout of 30,000ms (30 seconds).
```typescript

// Uses default timeout: 30 seconds
{ 
  name: 'FetchData', 
  useCapability: 'data/cap-fetch' 
}
```

### Custom Timeout

Override the default by setting timeout in milliseconds:
```typescript

// 10 seconds timeout
{ 
  name: 'GenerateReport', 
  useCapability: 'report/cap-generate',
  timeout: 10000 
}

// 60 seconds timeout (for external API calls)
{ 
  name: 'CallExternalAPI', 
  useCapability: 'integration/cap-api',
  timeout: 60000 
}

// No timeout (0 = infinite)
{ 
  name: 'HeavyProcessing', 
  useCapability: 'data/cap-process',
  timeout: 0 
}
```

### Timeout Error

If a step times out, the workflow will fail with an error:
text

❌ Step "GenerateReport" failed: ⏰ Step "GenerateReport" timeout after 10000ms
   💡 Tip: Increase timeout or check capability performance

---

## 🛡️ Allowed Rules (Guard)

The allowed property defines who can execute a workflow. It acts as a permission guard.
Syntax
```typescript

allowed: [
  { 
    key: string,      // Field name to check
    value: any,       // Expected value
    source: 'context' | 'input',  // Where to look
    operator?: 'eq' | 'neq' | 'in' | 'nin'  // Optional, defaults to 'eq'
  }
]

\\v2.0.0+ implement expression-based
allowed: {
    expr: 'status == "draft" && createdBy == userId',
    context: ['userId'],    // Variables from global context
    input: ['status', 'createdBy'] // Variables from workflow input
  }
```

Examples

### 1. Single rule - role-based access
```typescript

allowed: [
  { 
    key: 'role', 
    value: 'admin', 
    source: 'context',
    operator: 'eq'
  }
]
```

### 2. Multiple rules - all must pass (AND)
```typescript

allowed: [
  { key: 'role', value: 'leader', source: 'context', operator: 'eq' },
  { key: 'status', value: 'draft', source: 'input', operator: 'eq' }
]
```

### 3. Multiple values (IN operator)
```typescript

allowed: [
  { 
    key: 'role', 
    value: ['admin', 'manager', 'team_lead'], 
    source: 'context',
    operator: 'in'
  }
]
```

### 4. Using canExecute() in UI
```typescript

// Check if current user can execute workflow
const { allowed, reason } = runtime.canExecute('report/wf-generate', { 
  status: 'draft' 
});

if (allowed) {
  // Show the button
} else {
  // Show disabled state with reason
  console.log(reason); // "Guard failed: context.role eq admin (actual: member)"
}
```

### Dynamic Guard with Array-based or Expression-based

Compare input with context:
```typescript
allowed: [
  {
    key: 'createdBy',
    source: 'input',
    operator: 'neq',
    value: { key: 'userId', source: 'context' }
  }
]
// or using exppression
allowed: {
    expr: 'createdBy !== userId',
    context: ['userId'], input: ['createdBy'] 
  }
```

Meaning: input.createdBy != context.userId

Security: Expressions are sandboxed (no require, eval, Math.*, etc.) and limited to 500 characters.

### 📊 Summary

| Feature	| Default	                    | Customization                                     |
|:---       | :---                          | :---                                              |
| Timeout	| 30,000ms (30s)                | Per step: timeout: number (ms) or 0 for infinite  |
| Allowed   | None (everyone can execute)	| Per workflow: allowed: IAllowedGuard[ ] or IExpressionGuard            |

For complete examples, check the polaris-examples repository.

---

## 📊 Explorer

In development mode, Explorer auto-generates:

    Plugin list

    Workflow visualization

    Step dependencies

    Capability registry (with schema if we describe it)

```typescript

import { PolarisRuntime } from '@polaris/runtime/dev';

const runtime = new PolarisRuntime(); // auto-explorer enabled
runtime.register([...]); // explorer opens automatically
```

on node.js explorer creater at `rootDir\explorer`

on browser, explorer pop out, allowed pop out or just click open manual

---

## 🧪 Unit Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure
```text
tests/
├── runtime.test.ts              # Core runtime
├── event-state.test.ts          # Event & state
├── idempotency.test.ts          # Idempotency
├── timeout.test.ts              # Timeout
├── dynamic-guard.test.ts        # Dynamic guard
├── cross-plugin.test.ts         # Cross-plugin dependency
├── dag.test.ts                  # dependsOn
├── exp-guard.test.ts            # Expression guard
└── utils/
    └── mock-plugins.ts          # Shared mock plugins
```

---

## 📄 License

MIT © Polaris Team

---
---