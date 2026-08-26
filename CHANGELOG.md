# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-26

### Fixed
- **Allowed Workflow Emit Event Completed Before Context Changed**: the problem only ocured when using callback function on subscribe to change something like header with global context.

## [2.0.0] - 2026-08-21

### Added
- **Expression-based Guards (`IExpressionGuard`)**: Workflows now support complex conditional logic using safe JavaScript expressions (e.g., `status == "draft" && createdBy == userId`). 
- **Input and Outpur Schema on Workflow (`IWorkflow`)**: Experiment with LLM build new UI for existing example app, **LLM guessing input** use in `execute` and `canExecute`, so input and out schema added to workflow for complete self-describe explore read by Human and LLM so become **fully AI-Native** runtime

### Changed
- **`allowed` Type Union**: The `allowed` field in `IWorkflow` now supports both `IAllowedGuard[]` (array) and `IExpressionGuard` (object with `expr`), improving IDE intellisense in VSCode.
- **Consistent Guard Response**: Both `checkGuard` and `checkExpression` now return a uniform structure `{ passed, actualValue, expectedValue }` for better logging and debugging.

## [2.0.0-alpha.0] - 2026-08-19

### Added
- **Expression-based Guards (`IExpressionGuard`)**: Workflows now support complex conditional logic using safe JavaScript expressions (e.g., `status == "draft" && createdBy == userId`). 

### Changed
- **`allowed` Type Union**: The `allowed` field in `IWorkflow` now supports both `IAllowedGuard[]` (array) and `IExpressionGuard` (object with `expr`), improving IDE intellisense in VSCode.
- **Consistent Guard Response**: Both `checkGuard` and `checkExpression` now return a uniform structure `{ passed, actualValue, expectedValue }` for better logging and debugging.


## [1.3.0] - 2026-08-17

### Added
- **Capability Schema**  
  `inputSchema` and `outputSchema` using JSON Schema for documentation and LLM support.  
  → Displayed in Explorer and included in `catalog.json`.

- **Dynamic Allowed Guard**  
  Guard now supports dynamic value references: `{ "value": { "key": "userId", "source": "context" } }`.  
  → Enables comparison of `input.createdBy` with `context.userId`.

- **Multiple Dependencies Support (`dependsOn`)**  
  Steps with 2+ `dependsOn` now merge payloads from all dependencies.  
  → Non-object payloads are stored under the step name as key.  
  → Preserves `IResult` structure from the first dependency.

### Changed
- **`dependsOn` Merge Logic** → now uses spread operator to merge payloads.
- **Logger** → added warnings for non-object payloads and missing dependencies.

### Fixed
- **`dependsOn`** → previously only 1 dependency worked properly; now multiple dependencies are fully supported.

### Added (Testing)
- **Comprehensive Unit Tests** → 7 test files with 35+ test cases covering all runtime features.

### Removed
- None

### Deprecated
- None

## [1.2.1] - 2026-08-13

### Added
- **Plugin Metadata in Explorer**  
  Explorer now displays plugin version, description, and capability descriptions for better self-documentation.  
  → `pluginMeta` map stores `{ version, description }` per plugin.  
  → `buildCatalog()` includes these metadata in the catalog.

- **Cross-Plugin Dependency Visualization**  
  Explorer automatically detects and displays dependencies between plugins (based on `useCapability` across domains).  
  → Dependencies appear as badges in the plugin detail view.

- **Auto-Generate Explorer on `setAllowedContextWorkflow`**  
  In development mode, explorer regenerates automatically when `setAllowedContextWorkflow()` is called.  
  → Ensures documentation always reflects the current allowed context workflow.

### Changed
- **Explorer Generation**  
  Now uses `pluginMeta` as the source of truth for plugin metadata instead of scanning capabilities/workflows for duplication detection.  
  → Cleaner, more maintainable code.

- **`registerPlugin()` Duplication Check**  
  Plugin duplication is now detected via `pluginMeta.has(plugin.name)` before storing metadata.  
  → Prevents duplicate registration early and ensures metadata integrity.

- **Error Handling in Explorer Generation**  
  Improved logging and fallback for missing or failing `open` package.  
  → No more silent failures; user gets clear instruction to open the file manually.

### Removed
- **`Open` dependency on Node Environment**  
  No auto open browser on node JS environment to prevent error.
  → Just log path location polaris explorer to info and instruction open manualy

---

## [1.2.0] - 2026-08-11

### Release
- NPM releashe @polaris-runtime/core

### Changed
- update README.md releashed NPM
- update API.md explanation of data flow on every step and global context

---

## [1.1.0] - 2026-08-04

### Added
- Auto-explorer in development mode (`@polaris/runtime/dev`)
- Virtual HTML explorer support in browser environment
- Clean public API with minimal surface
- `subscribeAll()` method for subscribing to all workflow events
- Timeout management per step with configurable duration

### Changed
- Reduced public API surface for better clarity
- Improved logger with dev/prod modes
- Explorer now shows "No restrictions" for workflows without guards
- Optimized state cleanup mechanism

### Fixed
- Explorer encoding issues (emoji and symbols now display correctly)
- Memory leak prevention with proper state cleanup
- TypeScript build errors for Node.js environment

### Removed
- `getState()` method from public API (use subscribe instead)

---

## [1.0.0] - 2026-08-03

### Added
- Initial release of Polaris Runtime
- Core engine: `register`, `execute`, `canExecute`
- Logger with dev/prod mode
- Explorer auto-generate in Node.js environment
- Event system: `subscribe`, `subscribeAll`
- Context management for global state
- Guard & permission system (`allowed` + `canExecute`)
- Timeout management per step
- Idempotency to prevent duplicate execution
- Automatic state cleanup after 30 seconds
- TypeScript support with full type definitions