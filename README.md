# Polaris Runtime

> **Runtime explain himself with auto explorer app as documentary**  
> Build business applications as executable workflows.

Polaris Runtime is an execution engine for business workflows.  
It is **not** an application framework, **not** a UI framework, and **not** a backend framework.  
Its only responsibility is to execute business workflows declared by plugins.

---
## 📚 Documentation

- [Architecture](./ARCHITECTURE.md) — Design principles and core concepts
- [API Reference](./API.md) — Public API documentation

---

## 📦 Installation

```bash
npm install @polaris/runtime
```
---

## 🚀 Quick Start
```typescript
import { PolarisRuntime } from '@polaris/runtime';
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
import { PolarisRuntime } from '@polaris/runtime/dev';

// Production — silent (errors only)
import { PolarisRuntime } from '@polaris/runtime';
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
---

## 📊 Explorer

In development mode, Explorer auto-generates:

    Plugin list

    Workflow visualization

    Step dependencies

    Capability registry

```typescript

import { PolarisRuntime } from '@polaris/runtime/dev';

const runtime = new PolarisRuntime(); // auto-explorer enabled
runtime.register([...]); // explorer opens automatically
```
---

## 🧠 Philosophy

    "Speed of coding is no longer a bottleneck, AI is evolving, and understanding is the key"

Polaris separates business execution from presentation.

UI only triggers workflows and renders projections.

Business logic belongs to workflows and capabilities.

---

## 📄 License

MIT © Polaris Team

---
---