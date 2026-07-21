import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PolarisRuntime } from '../src/core/runtime.js';
import { WorkspacePlugin } from '../src/plugins/workspace.plugin.js';
import { DummyPlugin } from '../src/plugins/dummy.plugin.js';
import { generateCatalog, generateExplorerHTML } from '../src/explorer/generator.js';

// ===== ESM COMPATIBILITY =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const runtime = new PolarisRuntime();

  // Register plugins
  runtime.register([WorkspacePlugin, DummyPlugin]);
  runtime.setAllowedContextWorkflow('workspace/wf-set-context');

  // Generate catalog
  const catalog = generateCatalog(runtime);

  // Save JSON
  const jsonPath = path.join(__dirname, '../dist/polaris-runtime-catalog.json');
  fs.writeFileSync(jsonPath, JSON.stringify(catalog, null, 2));
  console.log(`✅ JSON catalog saved: ${jsonPath}`);

  // Save HTML
  const html = generateExplorerHTML(catalog);
  const htmlPath = path.join(__dirname, '../dist/polaris-explorer.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ HTML explorer saved: ${htmlPath}`);

  console.log('\n📊 Explorer generated successfully!');
}

main().catch(console.error);