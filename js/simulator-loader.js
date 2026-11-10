const $ = (id) => document.getElementById(id);

function safeReturnTarget(raw) {
  try {
    const candidate = new URL(raw || 'index.html', location.href);
    if (candidate.origin !== location.origin) return 'index.html';
    const file = candidate.pathname.split('/').pop();
    if (file !== 'index.html' && file !== 'tools.html') return 'index.html';
    return candidate.pathname + candidate.search + candidate.hash;
  } catch (_) {
    return 'index.html';
  }
}

function showLoadError(message) {
  const box = $('sceneFallback');
  if (box) {
    box.hidden = false;
    box.textContent = message;
  }
  const status = $('statusLabel');
  if (status) status.textContent = 'SIMULATION LOAD ERROR';
  console.error('[PHY tools] Simulator page failed:', message);
}

(async function bootSimulatorPage() {
  const query = new URLSearchParams(location.search);
  const toolId = query.get('id');
  const backLink = $('backLink');
  if (backLink) backLink.href = safeReturnTarget(query.get('from'));

  if (!toolId) {
    showLoadError('No simulation was selected. Return to the syllabus categories and choose a tool.');
    return;
  }

  try {
    const response = await fetch('./data/catalog.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Catalogue request failed (${response.status})`);
    const catalog = await response.json();
    const tool = (catalog.tools || []).find((item) => item.id === toolId);
    if (!tool) throw new Error(`Simulation '${toolId}' was not found in data/catalog.json`);

    const dataNode = $('tool-data');
    if (!dataNode) throw new Error('The simulator data container is missing.');
    dataNode.textContent = JSON.stringify(tool);
    document.title = `${tool.title} | PHY tools`;

    // Load the simulator only after its exact data has been placed in the page.
    // simulator.js initializes the controls/calculations first, then loads the 3D engine.
    await import('./simulator.js');
    document.documentElement.dataset.phySimulator = 'ready';
  } catch (error) {
    showLoadError(error && error.message ? error.message : String(error));
  }
})();
