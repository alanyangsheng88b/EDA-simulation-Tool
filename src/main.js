const COMPONENT_LIBRARY = [
  { type: 'V', name: '交流电压源', icon: '∿', defaults: { amplitude: 10, frequency: 50, phase: 0 } },
  { type: 'R', name: '电阻', icon: 'R', defaults: { resistance: 1000 } },
  { type: 'C', name: '电容', icon: 'C', defaults: { capacitance: 0.000047 } },
  { type: 'L', name: '电感', icon: 'L', defaults: { inductance: 0.01 } },
  { type: 'D', name: '二极管', icon: '▶|', defaults: { forwardVoltage: 0.7 } },
  { type: 'GND', name: '接地', icon: '⏚', defaults: {} },
  { type: 'PROBE', name: '电压探针', icon: '●', defaults: {} },
];

const EXAMPLES = [
  {
    title: '桥式整流', analysis: '.tran', desc: '全波桥式整流 + 滤波电容',
    components: [
      { id: 'v1', type: 'V', label: 'V1', x: 135, y: 92, params: { amplitude: 10, frequency: 50, phase: 0 } },
      { id: 'd1', type: 'D', label: 'D1', x: 248, y: 142, params: { forwardVoltage: 0.7 } },
      { id: 'd2', type: 'D', label: 'D2', x: 410, y: 92, params: { forwardVoltage: 0.7 } },
      { id: 'd3', type: 'D', label: 'D3', x: 248, y: 218, params: { forwardVoltage: 0.7 } },
      { id: 'd4', type: 'D', label: 'D4', x: 410, y: 286, params: { forwardVoltage: 0.7 } },
      { id: 'r1', type: 'R', label: 'RL', x: 575, y: 92, params: { resistance: 1000 } },
      { id: 'c1', type: 'C', label: 'CF', x: 575, y: 142, params: { capacitance: 0.000047 } },
      { id: 'g1', type: 'GND', label: 'GND', x: 710, y: 92, params: {} },
    ],
  },
  {
    title: 'RC 一阶充电', analysis: '.tran', desc: '阶跃输入下的 RC 充电曲线',
    components: [
      { id: 'v1', type: 'V', label: 'V1', x: 135, y: 150, params: { amplitude: 5, frequency: 25, phase: 0 } },
      { id: 'r1', type: 'R', label: 'R1', x: 320, y: 150, params: { resistance: 2200 } },
      { id: 'c1', type: 'C', label: 'C1', x: 510, y: 150, params: { capacitance: 0.0001 } },
      { id: 'g1', type: 'GND', label: 'GND', x: 630, y: 230, params: {} },
    ],
  },
  {
    title: 'RLC 串联谐振', analysis: '.tran', desc: '观察阻尼振荡与谐振响应',
    components: [
      { id: 'v1', type: 'V', label: 'V1', x: 120, y: 150, params: { amplitude: 8, frequency: 120, phase: 0 } },
      { id: 'r1', type: 'R', label: 'R1', x: 285, y: 150, params: { resistance: 180 } },
      { id: 'l1', type: 'L', label: 'L1', x: 445, y: 150, params: { inductance: 0.02 } },
      { id: 'c1', type: 'C', label: 'C1', x: 610, y: 150, params: { capacitance: 0.000022 } },
      { id: 'g1', type: 'GND', label: 'GND', x: 730, y: 230, params: {} },
    ],
  },
];

const state = {
  components: structuredClone(EXAMPLES[0].components),
  selectedId: 'v1',
  activeExample: EXAMPLES[0].title,
  stopTimeMs: 60,
  stepUs: 50,
  status: '拖入元器件、修改参数，然后运行瞬态分析',
  showGrid: true,
  drag: null,
};

const $ = (selector) => document.querySelector(selector);
const root = document.getElementById('root');

function uid(type) { return `${type.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`; }
function esc(value) { return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]); }
function formatValue(value) {
  if (value === undefined || value === null) return '';
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k`;
  if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(1);
  return Number(value).toPrecision(4).replace(/\.0+$/, '');
}
function libraryItem(type) { return COMPONENT_LIBRARY.find((item) => item.type === type); }
function getParamSummary(component) {
  const p = component.params;
  if (component.type === 'V') return `SIN ${p.amplitude}V ${p.frequency}Hz`;
  if (component.type === 'R') return `${formatValue(p.resistance)}Ω`;
  if (component.type === 'C') return `${formatValue(p.capacitance)}F`;
  if (component.type === 'L') return `${formatValue(p.inductance)}H`;
  if (component.type === 'D') return `Vf ${p.forwardVoltage}V`;
  return '';
}

function generateNetlist() {
  const { components, stopTimeMs, stepUs } = state;
  const source = components.find((c) => c.type === 'V');
  const lines = ['* 电子森林 EDA 自动网表', '.title interactive transient bench'];
  if (source) lines.push(`${source.label} in 0 SIN(0 ${source.params.amplitude} ${source.params.frequency} 0 0 ${source.params.phase})`);
  components.filter((c) => c.type === 'R').forEach((r, i) => lines.push(`${r.label} n${i + 1} out ${r.params.resistance}`));
  components.filter((c) => c.type === 'C').forEach((c) => lines.push(`${c.label} out 0 ${c.params.capacitance}`));
  components.filter((c) => c.type === 'L').forEach((l, i) => lines.push(`${l.label} n${i + 1} out ${l.params.inductance}`));
  components.filter((c) => c.type === 'D').forEach((d, i) => lines.push(`${d.label} ${i % 2 ? 'out in' : 'in out'} DFAST`));
  lines.push('.model DFAST D(IS=1e-14 RS=0.08 N=1.9)');
  lines.push(`.tran ${stepUs}u ${stopTimeMs}m`);
  lines.push('.print tran v(in) v(out) i(V1)');
  lines.push('.end');
  return lines.join('\n');
}

function simulateTransient(samples = 720) {
  const { components, stopTimeMs } = state;
  const source = components.find((c) => c.type === 'V') || { params: { amplitude: 10, frequency: 50, phase: 0 } };
  const resistor = components.find((c) => c.type === 'R') || { params: { resistance: 1000 } };
  const capacitor = components.find((c) => c.type === 'C') || { params: { capacitance: 0.000047 } };
  const inductor = components.find((c) => c.type === 'L') || { params: { inductance: 0.01 } };
  const diodes = components.filter((c) => c.type === 'D');
  const vf = diodes.reduce((sum, d) => sum + (Number(d.params.forwardVoltage) || 0.7), 0) / Math.max(1, diodes.length);
  const amp = Number(source.params.amplitude) || 0;
  const freq = Math.max(1, Number(source.params.frequency) || 50);
  const phase = ((Number(source.params.phase) || 0) * Math.PI) / 180;
  const r = Math.max(1, Number(resistor.params.resistance) || 1000);
  const c = Math.max(1e-9, Number(capacitor.params.capacitance) || 47e-6);
  const l = Math.max(1e-6, Number(inductor.params.inductance) || 0.01);
  const dt = (stopTimeMs / 1000) / samples;
  let out = 0;
  let current = 0;
  const tau = r * c;
  const rlcW0 = 1 / Math.sqrt(l * c);
  const damping = r / (2 * l);
  const data = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i * dt;
    const vin = amp * Math.sin(2 * Math.PI * freq * t + phase);
    if (diodes.length >= 4) {
      const target = Math.max(0, Math.abs(vin) - 2 * vf);
      out = target > out ? out + (target - out) * Math.min(1, dt / (tau * 0.08)) : out * Math.exp(-dt / tau);
    } else if (diodes.length > 0) {
      const target = Math.max(0, vin - vf);
      out += (target - out) * Math.min(1, dt / tau);
    } else if (components.some((item) => item.type === 'L')) {
      const accel = (vin - r * current - out) / l;
      current += accel * dt;
      out += (current / c) * dt;
      const envelope = Math.exp(-Math.min(damping, rlcW0 * 0.25) * t);
      out = out * 0.992 + amp * 0.12 * envelope * Math.sin(rlcW0 * t) * 0.008;
    } else {
      out += (vin - out) * Math.min(1, dt / tau);
    }
    data.push({ t: t * 1000, vin, out, current: (vin - out) / r });
  }
  return data;
}

function shellTemplate() {
  return `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand"><span class="led"></span>电子森林 · EDA 仿真工作台</div>
        <div class="mode-tabs"><button class="active">SPICE 网表仿真</button><button>交互式电路</button><button>CircuitJS</button></div>
        <div class="runtime">纯浏览器运行 · 免安装 · 可拖拽</div>
      </header>
      <aside class="sidebar">
        <section><h3>示例电路</h3><div id="examples"></div></section>
        <section><h3>元器件库</h3><div class="palette" id="palette"></div></section>
        <section class="sim-settings"><h3>瞬态分析</h3>
          <label>停止时间 ms<input id="stop-time" type="number" min="5" max="1000" value="${state.stopTimeMs}"></label>
          <label>步长 μs<input id="step-us" type="number" min="1" max="1000" value="${state.stepUs}"></label>
        </section>
      </aside>
      <section class="editor-panel">
        <div class="panel-title"><span>网表编辑器</span><kbd>Ctrl + Enter 运行</kbd></div>
        <textarea id="netlist" readonly spellcheck="false"></textarea>
        <div class="actions"><button class="primary" id="run">▶ 运行仿真</button><button id="copy">复制网表</button></div>
      </section>
      <section class="workspace">
        <div class="panel-title"><span>仿真结果</span><span class="badge">39.3 ms</span></div>
        <div class="board" id="board"><svg viewBox="0 0 820 380" role="img" aria-label="可拖拽电路图"></svg><button class="grid-toggle" id="grid-toggle"></button></div>
        <div class="analysis-card"><div class="card-head"><strong>瞬态分析</strong><span>.TRAN</span></div><canvas id="chart"></canvas><div class="legend"><span class="green">V(in)</span><span class="yellow">V(out)</span><em id="status"></em></div></div>
      </section>
      <aside class="inspector"><h3>参数面板</h3><div id="params"></div><h3>测量</h3><div class="metrics" id="metrics"></div></aside>
    </main>`;
}

function renderStaticLists() {
  $('#examples').innerHTML = EXAMPLES.map((example) => `<button class="example ${state.activeExample === example.title ? 'active' : ''}" data-example="${esc(example.title)}"><strong>${esc(example.title)}</strong><span>${example.analysis}</span></button>`).join('');
  $('#palette').innerHTML = COMPONENT_LIBRARY.map((item) => `<button draggable="true" data-type="${item.type}"><span>${esc(item.icon)}</span>${esc(item.name)}</button>`).join('');
}

function componentSymbol(component) {
  const shape = {
    V: '<circle r="22"/><path d="M -8 0 H 8 M 0 -8 V 8 M -20 0 H -34 M 20 0 H 34"/>',
    R: '<path d="M -34 0 H -22 L -15 -12 L -5 12 L 5 -12 L 15 12 L 22 0 H 34"/>',
    C: '<path d="M -34 0 H -8 M -8 -20 V 20 M 8 -20 V 20 M 8 0 H 34"/>',
    L: '<path d="M -34 0 H -22 C -22 -18 -2 -18 -2 0 C -2 -18 18 -18 18 0 H 34"/>',
    D: '<path d="M -34 0 H -12 L 12 -16 V 16 L -12 0 M 12 -20 V 20 M 12 0 H 34"/>',
    GND: '<path d="M 0 -20 V 0 M -24 0 H 24 M -16 10 H 16 M -8 20 H 8"/>',
    PROBE: '<circle r="18"/><circle r="5" fill="#18f783"/>',
  }[component.type];
  return `<g class="component ${component.id === state.selectedId ? 'selected' : ''}" data-id="${component.id}" transform="translate(${component.x} ${component.y})">
    <rect x="-38" y="-30" width="76" height="60" rx="14"></rect>${shape}
    <text class="label" y="-42">${esc(component.label)}</text><text class="value" y="50">${esc(getParamSummary(component))}</text></g>`;
}

function renderBoard() {
  const svg = $('#board svg');
  const sorted = [...state.components].sort((a, b) => a.x - b.x);
  const points = sorted.filter((c) => c.type !== 'GND').map((c) => [c.x, c.y]);
  const ground = state.components.find((c) => c.type === 'GND');
  const wirePaths = points.slice(0, -1).map((p, i) => `<path d="M ${p[0] + 34} ${p[1]} H ${points[i + 1][0] - 34}"></path>`).join('');
  const groundPaths = ground ? points.map((p, i) => `<path d="M ${p[0]} ${p[1] + 32} V ${ground.y + 30} H ${ground.x}" data-ground="${i}"></path>`).join('') : '';
  const nodes = points.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" data-node="${i}"></circle>`).join('');
  const grid = state.showGrid ? '<defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(86,255,164,.08)" stroke-width="1"/></pattern></defs><rect width="820" height="380" fill="url(#grid)"/>' : '';
  svg.innerHTML = `${grid}<g class="wires">${wirePaths}${groundPaths}${nodes}</g>${state.components.map(componentSymbol).join('')}`;
  $('#grid-toggle').textContent = state.showGrid ? '隐藏网格' : '显示网格';
}

function renderParams() {
  const selected = state.components.find((c) => c.id === state.selectedId);
  if (!selected) { $('#params').innerHTML = '<p>选择一个元器件以编辑参数。</p>'; return; }
  const fields = {
    V: [['amplitude', '幅值 (V)', 0, 100, 0.1], ['frequency', '频率 (Hz)', 1, 10000, 1], ['phase', '相位 (°)', -360, 360, 1]],
    R: [['resistance', '电阻 (Ω)', 1, 1000000, 1]], C: [['capacitance', '电容 (F)', 1e-9, 1, 0.000001]],
    L: [['inductance', '电感 (H)', 0.000001, 10, 0.001]], D: [['forwardVoltage', '导通压降 (V)', 0.1, 2, 0.05]],
  }[selected.type] || [];
  $('#params').innerHTML = `<div class="params"><div class="selected-title"><span>${esc(selected.label)}</span><small>${esc(libraryItem(selected.type).name)}</small></div>
    ${fields.map(([key, label, min, max, step]) => `<label>${label}<input type="number" min="${min}" max="${max}" step="${step}" value="${selected.params[key]}" data-param="${key}"></label>`).join('') || '<p>该元件没有可调电气参数。</p>'}
    <button class="danger" id="delete-component">删除元器件</button></div>`;
}

function renderChart(data) {
  const canvas = $('#chart');
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#06150e'; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(93, 255, 163, 0.09)'; ctx.lineWidth = 1;
  for (let x = 54; x < width; x += (width - 80) / 6) { ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, height - 36); ctx.stroke(); }
  for (let y = 24; y < height - 36; y += (height - 70) / 4) { ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(width - 18, y); ctx.stroke(); }
  const values = data.flatMap((d) => [d.vin, d.out]);
  const max = Math.max(1, ...values.map((v) => Math.abs(v))) * 1.15;
  const xFor = (t) => 48 + (t / state.stopTimeMs) * (width - 78);
  const yFor = (v) => 24 + (1 - (v + max) / (2 * max)) * (height - 64);
  ctx.font = '12px monospace'; ctx.fillStyle = '#85a894';
  [-max, 0, max].forEach((v) => ctx.fillText(formatValue(v), 12, yFor(v) + 4));
  const drawLine = (key, color) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.beginPath(); data.forEach((d, i) => { const x = xFor(d.t); const y = yFor(d[key]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); ctx.restore(); };
  drawLine('vin', '#15f77f'); drawLine('out', '#f3b63d');
  ctx.fillStyle = '#a6cdb5'; ctx.fillText(`时间 (${state.stopTimeMs} ms)`, width - 110, height - 12);
}

function renderMetrics(data) {
  const out = data.map((d) => d.out), vin = data.map((d) => d.vin);
  const rms = Math.sqrt(out.reduce((sum, v) => sum + v * v, 0) / out.length);
  $('#metrics').innerHTML = `<div><strong>${Math.max(...out).toFixed(2)} V</strong><span>输出峰值</span></div><div><strong>${rms.toFixed(2)} V</strong><span>输出 RMS</span></div><div><strong>${Math.max(...vin.map((v) => Math.abs(v))).toFixed(2)} V</strong><span>输入峰值</span></div>`;
}

function renderDynamic() {
  const data = simulateTransient();
  $('#netlist').value = generateNetlist();
  $('#status').textContent = state.status;
  $('#stop-time').value = state.stopTimeMs;
  $('#step-us').value = state.stepUs;
  renderStaticLists(); renderBoard(); renderParams(); renderChart(data); renderMetrics(data);
}

function addComponent(type, x = 380, y = 220) {
  const lib = libraryItem(type);
  const nextCount = state.components.filter((c) => c.type === type).length + 1;
  const component = { id: uid(type), type, label: `${type}${type === 'GND' ? '' : nextCount}`, x: Math.round(x), y: Math.round(y), params: { ...lib.defaults } };
  state.components.push(component); state.selectedId = component.id; state.status = `已添加 ${lib.name}`; renderDynamic();
}
function runSimulation() {
  const data = simulateTransient();
  const peak = Math.max(...data.map((d) => d.out));
  const tail = data.slice(-160).map((d) => d.out);
  const ripple = Math.max(...tail) - Math.min(...tail);
  state.status = `瞬态分析完成：${data.length} 点，输出峰值 ${peak.toFixed(2)} V，末段纹波 ${Math.abs(ripple).toFixed(2)} V`;
  renderDynamic();
}
function svgPoint(event, container) {
  const svg = container.closest?.('svg') || container.querySelector('svg');
  const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function bindEvents() {
  root.addEventListener('click', (event) => {
    const exampleButton = event.target.closest('[data-example]');
    if (exampleButton) {
      const example = EXAMPLES.find((item) => item.title === exampleButton.dataset.example);
      state.components = structuredClone(example.components); state.selectedId = state.components[0]?.id; state.activeExample = example.title; state.status = `已载入示例：${example.desc}`; renderDynamic(); return;
    }
    const paletteButton = event.target.closest('.palette [data-type]');
    if (paletteButton) { addComponent(paletteButton.dataset.type); return; }
    const component = event.target.closest('.component');
    if (component) { state.selectedId = component.dataset.id; renderDynamic(); return; }
    if (event.target.id === 'grid-toggle') { state.showGrid = !state.showGrid; renderDynamic(); return; }
    if (event.target.id === 'run') { runSimulation(); return; }
    if (event.target.id === 'copy') navigator.clipboard?.writeText(generateNetlist());
    if (event.target.id === 'delete-component') { state.components = state.components.filter((c) => c.id !== state.selectedId); state.selectedId = state.components[0]?.id; state.status = '元器件已删除'; renderDynamic(); }
  });
  root.addEventListener('input', (event) => {
    if (event.target.id === 'stop-time') state.stopTimeMs = Number(event.target.value);
    if (event.target.id === 'step-us') state.stepUs = Number(event.target.value);
    if (event.target.dataset.param) {
      const selected = state.components.find((c) => c.id === state.selectedId);
      selected.params[event.target.dataset.param] = Number(event.target.value);
    }
    renderDynamic();
  });
  root.addEventListener('dragstart', (event) => { if (event.target.matches('.palette [data-type]')) event.dataTransfer.setData('component/type', event.target.dataset.type); });
  $('#board').addEventListener('dragover', (event) => event.preventDefault());
  $('#board').addEventListener('drop', (event) => { event.preventDefault(); const type = event.dataTransfer.getData('component/type'); if (type) { const point = svgPoint(event, $('#board')); addComponent(type, point.x, point.y); } });
  $('#board').addEventListener('pointerdown', (event) => {
    const component = event.target.closest('.component'); if (!component) return;
    const current = state.components.find((c) => c.id === component.dataset.id); const point = svgPoint(event, component);
    state.selectedId = current.id; state.drag = { id: current.id, dx: point.x - current.x, dy: point.y - current.y }; component.setPointerCapture(event.pointerId); renderDynamic();
  });
  $('#board').addEventListener('pointermove', (event) => {
    if (!state.drag) return;
    const point = svgPoint(event, $('#board'));
    const nx = Math.max(42, Math.min(778, point.x - state.drag.dx));
    const ny = Math.max(58, Math.min(338, point.y - state.drag.dy));
    state.components = state.components.map((c) => c.id === state.drag.id ? { ...c, x: Math.round(nx / 8) * 8, y: Math.round(ny / 8) * 8 } : c);
    renderDynamic();
  });
  window.addEventListener('pointerup', () => { state.drag = null; });
  window.addEventListener('resize', () => renderDynamic());
  root.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') runSimulation(); });
}

root.innerHTML = shellTemplate();
bindEvents();
renderDynamic();
