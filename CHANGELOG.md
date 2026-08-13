# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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