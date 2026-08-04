# Polaris Runtime Architecture

> Build Business Applications as Executable Workflows.

---

# Philosophy

Polaris Runtime is an execution engine for business workflows.

It is **not** an application framework, **not** a UI framework, and **not** a backend framework.

Its only responsibility is to execute business workflows declared by plugins.

Polaris separates **business execution** from **presentation**.

```
User
    ↓
Workflow
    ↓
Step
    ↓
Capability
    ↓
State
    ↓
UI
```

Business logic belongs to workflows and capabilities.

UI only triggers workflows and renders projections.

---

# Design Principles

## Runtime is Domain Agnostic

Runtime never knows what "Note", "Advance", "Meeting", or "Inventory" means.

Runtime only understands:

- Plugin
- Workflow
- Step
- Capability
- Context
- Allowed

Every business domain lives inside plugins.

---

## Contract First

Everything executable must have an explicit contract.

Examples:

- Plugin Manifest
- Workflow Definition
- Capability Definition
- Step Definition

Contracts are the public language of Polaris.

---

## Declarative over Imperative

A workflow is described by a manifest.

Runtime interprets the manifest.

Example:

Workflow

↓

Step

↓

Capability

↓

Next Step

Runtime never hardcodes business behavior.

---

## Living Documentation

Every executable object contains metadata.

Examples:

- title
- description
- version
- author

Explorer reads these contracts directly.

Documentation is generated from runtime definitions instead of handwritten documents.

---

## AI Native

Polaris is designed so humans and AI can understand the system using the same contracts.

Descriptions are considered part of the architecture.

A workflow should explain:

- what it does
- why it exists
- which capability it uses

without reading implementation code.

---

# Core Concepts

## Plugin

A plugin is a self-contained business module.

A plugin may register:

- capabilities
- workflows

Runtime does not know plugin implementation.

---

## Capability

Capability is the smallest executable business unit.

Examples:

- save note
- send email
- upload attachment
- allocate cash

Capabilities are reusable across workflows.

---

## Workflow

Workflow represents a business process.

Example:

Create Advance

↓

Validate Request

↓

Allocate Budget

↓

Save Advance

↓

Notify Treasurer

A workflow is composed of ordered steps.

---

## Step

A step executes exactly one capability.

A step should be understandable without reading code.

Each step has:

- title
- description
- capability

---

## Context

Execution context carries data between steps.

Runtime owns the context.

Capabilities receive context.

Capabilities return results.

---

## Projection

Projection transforms execution state into presentation state.

UI reads state.

UI never reconstructs business state.

---

## Allowed

Allowed defines which workflows may be executed for the current projection.

Instead of UI deciding:

```
if (status == ...)
```

Projection exposes use canExecute(workflowPath):

```
allowed:

- ApproveAdvance
- RejectAdvance
```

UI simply renders available actions.

---

# Runtime Responsibilities

Runtime is responsible for:

- loading plugins
- registering workflows
- registering capabilities
- executing workflows
- passing execution context
- resolving capabilities
- reporting execution state

Runtime is NOT responsible for:

- rendering UI
- storing domain models
- HTTP
- databases
- business decisions

---

# UI Responsibilities

UI only:

- starts workflows
- displays projections
- displays allowed/canExecute actions

UI must not contain business rules.

---

# Plugin Responsibilities

Plugins own:

- business rules
- workflow definitions
- capability implementations
- projections

---

# Explorer

Explorer is not a debugger.

Explorer is a runtime documentation tool.

Explorer visualizes:

Plugin

↓

Workflow

↓

Step

↓

Capability

↓

Projection

↓

Allowed

Every object shown by Explorer comes from runtime contracts.

---

# Architecture Layers

```
┌──────────────────────────────┐
│ UI                           │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ Projection                   │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ Workflow Executor            │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ Capability Registry          │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ Plugins                      │
└──────────────────────────────┘
```

---

# Project Goal

Polaris aims to provide an execution runtime where:

- business processes are explicit
- business rules are discoverable
- documentation is generated from contracts
- onboarding is fast
- plugins are isolated
- AI can understand execution without reading implementation

The runtime should remain small, readable, and independent from any UI framework or backend technology.