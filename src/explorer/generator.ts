import { PolarisRuntime } from '../core/runtime';
import * as fs from 'fs'
import * as path from 'path';

export function generateCatalog(runtime: PolarisRuntime) {
  // Ambil semua data dari Map
  const capabilities = Array.from(runtime['capabilities'].entries());
  const workflows = Array.from(runtime['workflows'].entries());

  const pluginMap = new Map<string, any>();

  // Group capabilities
  for (const [name, cap] of capabilities) {
    const plugin = name.split('/')[0];
    if (!pluginMap.has(plugin)) {
      pluginMap.set(plugin, { name: plugin, capabilities: [], workflows: [] });
    }
    pluginMap.get(plugin).capabilities.push({
      name: cap.name,
      description: cap.description || ''
    });
  }

  // Group workflows
  for (const [name, wf] of workflows) {
    const plugin = name.split('/')[0];
    if (!pluginMap.has(plugin)) {
      pluginMap.set(plugin, { name: plugin, capabilities: [], workflows: [] });
    }
    pluginMap.get(plugin).workflows.push({
      name: wf.name,
      description: wf.description || '',
      allowed: wf.allowed || [],
      steps: wf.steps.map(s => ({
        name: s.name,
        useCapability: s.useCapability
      }))
    });
  }

  const plugins = Array.from(pluginMap.values());

  return {
    runtime: {
      name: 'Polaris Runtime',
      version: '1.0.0',
      allowedContextWorkflow: runtime.getAllowedContextWorkflow()
    },
    statistics: {
      totalPlugins: plugins.length,
      totalWorkflows: workflows.length,
      totalCapabilities: capabilities.length
    },
    plugins
  };
}

export function generateExplorerHTML(catalog: any): string {
  const allowedWorkflow = catalog.runtime.allowedContextWorkflow || 'None';
  const jsonString = JSON.stringify(catalog, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Polaris Explorer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0b0b0b; color: #e0e0e0; display: flex; height: 100vh; }
    .sidebar { width: 220px; background: #141414; border-right: 1px solid #2a2a2a; padding: 20px; overflow-y: auto; flex-shrink: 0; }
    .sidebar h1 { font-size: 20px; color: #fff; margin-bottom: 8px; }
    .sidebar .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
    .nav-item { padding: 8px 12px; border-radius: 6px; cursor: pointer; color: #aaa; font-size: 14px; }
    .nav-item:hover { background: #1e1e1e; color: #fff; }
    .nav-item.active { background: #1e1e1e; color: #6c63ff; }
    .main { flex: 1; padding: 24px; overflow-y: auto; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #141414; padding: 16px 24px; border-radius: 12px; border: 1px solid #2a2a2a; flex: 1; }
    .stat-card .num { font-size: 28px; font-weight: 700; color: #fff; }
    .stat-card .label { color: #888; font-size: 13px; }
    .badge-allowed { background: #1a2a1a; color: #6caf7a; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
    .badge-plugin { background: #1a1a2a; color: #6c63ff; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
    .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .card-title { font-weight: 600; color: #fff; font-size: 14px; }
    .card-desc { color: #999; font-size: 13px; margin: 4px 0; }
    .json-box { background: #0b0b0b; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow: auto; max-height: 300px; border: 1px solid #2a2a2a; }
    .json-box pre { margin: 0; color: #e0e0e0; }
    .step { padding: 3px 0; font-size: 13px; color: #ccc; border-bottom: 1px solid #1a1a1a; }
    .step .cap { color: #6c63ff; }
    .guard { background: #1a1a2a; padding: 2px 10px; border-radius: 4px; font-size: 12px; display: inline-block; margin: 2px 4px 2px 0; border: 1px solid #2a2a3a; }
    .copy-btn { background: #2a2a2a; border: none; color: #e0e0e0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .copy-btn:hover { background: #3a3a3a; }
    .flex { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .mt-8 { margin-top: 8px; }
    .section-title { font-size: 18px; font-weight: 600; color: #fff; margin: 16px 0 8px; }
    .split { display: flex; gap: 20px; }
    .split-col { flex: 1; min-width: 0; }
    .col-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 1px solid #2a2a2a; }
  </style>
</head>
<body>
  <div class="sidebar">
    <h1>⚡ Polaris</h1>
    <div class="sub">Explorer</div>
    <div class="nav-item active" data-target="overview">📋 Overview</div>
    ${catalog.plugins.map((p: any) => `
      <div class="nav-item" data-target="${p.name}">📦 ${p.name}</div>
    `).join('')}
  </div>

  <div class="main" id="content"></div>

  <script>
    const data = ${JSON.stringify(catalog)};
    const content = document.getElementById('content');

    function renderOverview() {
      content.innerHTML = \`
        <h2 style="margin-bottom:16px;">📊 Overview</h2>
        <div class="stats">
          <div class="stat-card"><div class="num">\${data.statistics.totalPlugins}</div><div class="label">Plugins</div></div>
          <div class="stat-card"><div class="num">\${data.statistics.totalWorkflows}</div><div class="label">Workflows</div></div>
          <div class="stat-card"><div class="num">\${data.statistics.totalCapabilities}</div><div class="label">Capabilities</div></div>
        </div>
        <div class="card">
          <div class="flex"><span class="card-title">🔒 Allowed Context Workflow</span> <span class="badge-allowed">${allowedWorkflow}</span></div>
        </div>
        <div class="card">
          <div class="flex"><span class="card-title">📋 JSON Catalog</span> <button class="copy-btn" onclick="copyJson()">Copy</button></div>
          <div class="json-box"><pre id="jsonPre">${jsonString}</pre></div>
        </div>
      \`;
    }

    function renderPlugin(name) {
      const plugin = data.plugins.find(p => p.name === name);
      if (!plugin) return renderOverview();

      let capsHtml = '';
      let wfsHtml = '';

      // Capabilities
      if (plugin.capabilities && plugin.capabilities.length) {
        plugin.capabilities.forEach(c => {
          capsHtml += \`
            <div class="card">
              <div class="card-title">⚡ \${c.name}</div>
              <div class="card-desc">\${c.description || ''}</div>
            </div>
          \`;
        });
      } else {
        capsHtml = '<div style="color:#666;font-size:14px;">No capabilities</div>';
      }

      // Workflows
      if (plugin.workflows && plugin.workflows.length) {
        plugin.workflows.forEach(w => {
          const isAllowed = data.runtime.allowedContextWorkflow === w.name;
          wfsHtml += \`
            <div class="card">
              <div class="flex">
                <span class="card-title">🔄 \${w.name}</span>
                \${isAllowed ? '<span class="badge-allowed">🔒 Allowed Context</span>' : ''}
              </div>
              <div class="card-desc">\${w.description || ''}</div>
              <div class="mt-8">
                <div style="color:#888;font-size:12px;">🛡️ Allowed:</div>
                \${w.allowed && w.allowed.length ? w.allowed.map(g => 
                  \`<span class="guard">\${g.source}.\${g.key} \${g.operator || 'eq'} \${JSON.stringify(g.value)}</span>\`
                ).join('') : '<span style="color:#666;">No restrictions</span>'}
              </div>
              <div class="mt-8">
                <div style="color:#888;font-size:12px;">📋 Steps:</div>
                \${w.steps.map(s => \`
                  <div class="step">▸ \${s.name} → <span class="cap">\${s.useCapability}</span></div>
                \`).join('')}
              </div>
            </div>
          \`;
        });
      } else {
        wfsHtml = '<div style="color:#666;font-size:14px;">No workflows</div>';
      }

      content.innerHTML = \`
        <h2 style="margin-bottom:8px;">📦 \${plugin.name}</h2>
        <div style="color:#888;margin-bottom:16px;">\${plugin.description || ''}</div>
        <div class="split">
          <div class="split-col">
            <div class="col-title">⚡ Capabilities</div>
            \${capsHtml}
          </div>
          <div class="split-col">
            <div class="col-title">🔄 Workflows</div>
            \${wfsHtml}
          </div>
        </div>
      \`;
    }

    function copyJson() {
      const text = document.getElementById('jsonPre').innerText;
      navigator.clipboard.writeText(text).then(() => alert('JSON copied!'));
    }

    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        el.classList.add('active');
        const target = el.dataset.target;
        if (target === 'overview') renderOverview();
        else renderPlugin(target);
      });
    });

    renderOverview();
  </script>
</body>
</html>`;
}