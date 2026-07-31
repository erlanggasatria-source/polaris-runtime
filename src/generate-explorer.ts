import * as fs from 'fs';
import * as path from 'path';
import { PolarisRuntime } from './core/runtime.js';
import { generateCatalog, generateExplorerHTML } from './explorer/generator.js';
import { WorkspacePlugin } from './plugins/workspace-plugin.js';
import { MeetingPlugin } from './plugins/meeting-plugin.js';
import { RepoPlugin } from './plugins/repo-plugin.js';

async function main() {
  const runtime = new PolarisRuntime();

  runtime.register([WorkspacePlugin, MeetingPlugin, RepoPlugin]);
  runtime.setAllowedContextWorkflow('workspace/wf-set-context');

  const catalog = generateCatalog(runtime);

  // ===== TANPA __dirname =====
  const jsonPath = path.resolve('dist/polaris-runtime-catalog.json');
  fs.writeFileSync(jsonPath, JSON.stringify(catalog, null, 2));
  console.log(`✅ JSON catalog saved: ${jsonPath}`);

  const html = generateExplorerHTML(catalog);
  const htmlPath = path.resolve('dist/polaris-explorer.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ HTML explorer saved: ${htmlPath}`);

  console.log('\n📊 Explorer generated successfully!');
}

main().catch(console.error);