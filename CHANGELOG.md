# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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