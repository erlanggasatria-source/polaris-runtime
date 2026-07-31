import { PolarisRuntime } from './core/runtime';
import { MeetingPlugin, RepoPlugin, WorkspacePlugin } from './plugins';
import { generateCatalog, generateExplorerHTML } from './explorer/generator';

async function main() {
  const runtime = new PolarisRuntime();

  console.log('📦 Registering plugins...\n');
  runtime.register([WorkspacePlugin, RepoPlugin, MeetingPlugin]);

  const catalog = generateCatalog(runtime);
  const explorer = generateExplorerHTML(catalog);
  
  console.log(catalog);
  console.log(explorer);

  
}

main().catch(console.error);