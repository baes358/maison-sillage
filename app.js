function createMist() {
  const container = document.getElementById('mist-container');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'mist-particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
    container.appendChild(p);
  }
};

// ══════════════════════════════════════════ STATE
const state = {
  mood: 50,
  time: 'Jour',
  texture: 'Frais',
  customName: ''
};

// ══════════════════════════════════════════ NAVIGATION
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + screenId);
  target.classList.add('active');

  // Re-trigger card row animations on reveal
  if (screenId === 'reveal') {
    target.querySelectorAll('.card-row').forEach(r => {
      r.style.animation = 'none';
      r.offsetHeight; // reflow
      r.style.animation = '';
    });
    // Re-trigger bottle reveal
    const bw = target.querySelector('.reveal-bottle-wrap');
    if (bw) { bw.style.animation = 'none'; bw.offsetHeight; bw.style.animation = ''; }
    const fc = target.querySelector('.fragrance-card');
    if (fc) { fc.style.animation = 'none'; fc.offsetHeight; fc.style.animation = ''; }
    const ar = target.querySelector('.actions-row');
    if (ar) { ar.style.animation = 'none'; ar.offsetHeight; ar.style.animation = ''; }
  }
}

// ══════════════════════════════════════════ OPTION BUTTONS
document.querySelectorAll('.option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.group;
    document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state[group] = btn.dataset.val;
  });
});

document.getElementById('mood').addEventListener('input', e => state.mood = +e.target.value);
document.getElementById('fragrance-name-input').addEventListener('input', e => state.customName = e.target.value);

// ══════════════════════════════════════════ GENERATION
async function startGeneration() {
  goTo('generating');
  animateGenerating();
  // Run API call and minimum display time in parallel so we don't double-wait
  const [fragrance] = await Promise.all([
    callClaude(),
    new Promise(r => setTimeout(r, 2500))
  ]);
  renderReveal(fragrance);
  goTo('reveal');
}

const genMessages = [
  'Infusing top notes…',
  'Balancing heart accords…',
  'Anchoring the base…',
  'Macerating oils…',
  'Composing your signature…'
];

function animateGenerating() {
  let i = 0;
  const el = document.getElementById('gen-text');
  const liquid = document.getElementById('gen-liquid');

  liquid.setAttribute('y', '216');
  liquid.setAttribute('height', '0');

  const intervalId = setInterval(() => {
    if (!document.getElementById('screen-generating').classList.contains('active')) {
      clearInterval(intervalId);
      return;
    }
    el.style.opacity = 0;
    setTimeout(() => {
      el.textContent = genMessages[i % genMessages.length];
      el.style.opacity = 1;
      el.style.transition = 'opacity 0.5s';
    }, 300);
    i++;

    const fillH = Math.min((i / genMessages.length) * 144, 144);
    liquid.setAttribute('y', String(216 - fillH));
    liquid.setAttribute('height', String(fillH));
    const shine = document.getElementById('gen-liquid-shine');
    if (shine) { shine.setAttribute('y', String(216 - fillH)); shine.setAttribute('height', String(fillH)); }
  }, 900);
}

// ══════════════════════════════════════════ CLAUDE API
async function callClaude() {
  const moodWord = state.mood < 33 ? 'tender and soft' : state.mood > 66 ? 'bold and daring' : 'balanced and composed';
  const prompt = `You are a master perfumer. Create a unique perfume based on these inputs:
- Mood: ${moodWord} (${state.mood}/100)
- Time: ${state.time}
- Texture: ${state.texture}
${state.customName ? `- Requested name: "${state.customName}"` : ''}

Respond ONLY with valid JSON, no markdown, no explanation, exactly this schema:
{
  "schemaVersion": "MF-1.0",
  "fragranceName": "string (2-3 evocative words, ${state.customName ? 'use the requested name' : 'poetic and original'})",
  "concentration": "Eau de Parfum",
  "family": "string (e.g. Woody Floral, Citrus Aromatic, Oriental Chypre)",
  "olfactoryPyramid": {
    "top": ["note1", "note2"],
    "heart": ["note1", "note2", "note3"],
    "base": ["note1", "note2"]
  },
  "character": {
    "mood": "string (single evocative adjective)",
    "intensity": 0.0,
    "longevityHours": 0.0,
    "projection": 0.0
  },
  "visualIdentity": {
    "primaryHue": 0,
    "minimalism": 0.0
  },
  "batch": {
    "year": 2026,
    "batchCode": "XX-26-000",
    "editionSize": 0
  }
}
Rules: intensity 0-1, longevityHours 2-12, projection 0-1, primaryHue 0-360, minimalism 0-1, editionSize 50-500, batchCode format 2letters-26-3digits. Be creative and evocative.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    return {
      schemaVersion: 'MF-1.0',
      fragranceName: state.customName || 'Lumière Voilée',
      concentration: 'Eau de Parfum',
      family: 'Floral Musqué',
      olfactoryPyramid: {
        top: ['Bergamote', 'Pétale de Rose'],
        heart: ['Iris', 'Jasmin Blanc', 'Thé Vert'],
        base: ['Bois de Santal', 'Musc Chaud', 'Ambre Doux']
      },
      character: { mood: 'Serein', intensity: 0.58, longevityHours: 7.5, projection: 0.52 },
      visualIdentity: { primaryHue: state.mood * 2.4, minimalism: 0.75 },
      batch: { year: 2026, batchCode: 'LV-26-031', editionSize: 175 }
    };
  }
}

// ══════════════════════════════════════════ RENDER
function projectionLabel(v) {
  if (v < 0.35) return 'Intime';
  if (v < 0.6) return 'Modérée';
  if (v < 0.8) return 'Affirmée';
  return 'Intense';
}

function notesJoined(arr) {
  if (!arr || !arr.length) return '—';
  return arr.map((n, i) => i < arr.length - 1 ? n + ' <span>·</span> ' : n).join('');
}

let currentFragrance = null;

function renderReveal(f) {
  currentFragrance = f;
  const hue = f.visualIdentity?.primaryHue ?? 214;

  document.documentElement.style.setProperty('--accent-hue', hue);

  const elLiquidTop = document.getElementById('liquidTop');
  const elLiquidBot = document.getElementById('liquidBot');
  const elGenLiquid = document.getElementById('gen-liquid');
  if (elLiquidTop) elLiquidTop.setAttribute('stop-color', `hsl(${hue},40%,72%)`);
  if (elLiquidBot) elLiquidBot.setAttribute('stop-color', `hsl(${hue},46%,46%)`);
  if (elGenLiquid) elGenLiquid.setAttribute('fill', `hsl(${hue},40%,70%)`);

  document.getElementById('card-name').textContent = f.fragranceName || '—';
  document.getElementById('card-concentration').textContent = f.concentration || 'Eau de Parfum';
  document.getElementById('card-family').textContent = f.family || '—';
  document.getElementById('card-top').innerHTML = notesJoined(f.olfactoryPyramid?.top);
  document.getElementById('card-heart').innerHTML = notesJoined(f.olfactoryPyramid?.heart);
  document.getElementById('card-base').innerHTML = notesJoined(f.olfactoryPyramid?.base);
  document.getElementById('char-mood').textContent = f.character?.mood || '—';
  document.getElementById('char-longevity').textContent = (f.character?.longevityHours || 0).toFixed(1) + ' h';
  document.getElementById('char-projection').textContent = projectionLabel(f.character?.projection || 0.5);
  document.getElementById('char-intensity').textContent = Math.round((f.character?.intensity || 0.5) * 100) + '%';
  document.getElementById('card-batch').textContent = f.batch?.batchCode || '—';
  document.getElementById('card-edition').textContent = `Édition ${f.batch?.editionSize || '—'}`;
  document.getElementById('bottle-name-label').textContent = (f.concentration || 'Eau de Parfum').toUpperCase();

  updateCellarCount();
}

// ══════════════════════════════════════════ ARCHIVE
async function downloadCard() {
  if (!currentFragrance) return;

  // Save to cellar
  try {
    const cellar = JSON.parse(localStorage.getItem('maisonsillage-cellar') || '[]');
    cellar.push({ ...currentFragrance, savedAt: Date.now() });
    localStorage.setItem('maisonsillage-cellar', JSON.stringify(cellar));
    updateCellarCount();
  } catch(e) {}

  // Ensure custom fonts are loaded before drawing
  // Use FontFace API to explicitly load fonts into canvas context
  try {
    // Load Maison font explicitly via FontFace so canvas can use it
    const maisonFont = new FontFace('Maison', 'url(./fonts/CS-MaisonSezanne-Regular.ttf)');
    const maisonLoaded = await maisonFont.load();
    document.fonts.add(maisonLoaded);

    // Load Jost font explicitly
    const jostFont = new FontFace('Jost', 'url(./fonts/Jost-VariableFont_wght.ttf)');
    const jostLoaded = await jostFont.load();
    document.fonts.add(jostLoaded);

    await document.fonts.ready;
  } catch(e) {
    // Fallback: wait a bit for fonts to be available
    await new Promise(r => setTimeout(r, 500));
  }

  const f = currentFragrance;
  const W = 800, H = 1130;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // --- COLORS ---
  const bgCream    = '#f5f0ea';
  const bgTop      = '#f0e8e0';
  const textDark   = '#3d2c2c';
  const textScript  = '#5c3a3a';
  const textMuted  = '#9a8a7a';
  const textLabel  = '#8a7a6a';
  const lineColor  = '#d4c4b0';
  const sealColor  = '#c0b0a0';

  // --- BACKGROUND ---
  // Subtle gradient from slightly pink top to warm cream
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#f2ebe3');
  bgGrad.addColorStop(0.04, '#f5f0ea');
  bgGrad.addColorStop(1, '#f5f0ea');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Top accent bar (subtle mauve/pink)
  const topBar = ctx.createLinearGradient(0, 0, W, 0);
  topBar.addColorStop(0, '#e8d8cc');
  topBar.addColorStop(0.3, '#d4a8a0');
  topBar.addColorStop(0.5, '#c89090');
  topBar.addColorStop(0.7, '#d4a8a0');
  topBar.addColorStop(1, '#e8d8cc');
  ctx.fillStyle = topBar;
  ctx.fillRect(0, 0, W, 5);

  const px = 60;
  let y = 80;

  // --- HEADER: Maison sillage ---
  ctx.textAlign = 'center';
  ctx.fillStyle = textScript;
  ctx.font = '400 52px "Maison", cursive';
  ctx.fillText('Maison Sillage', W / 2, y);
  y += 32;

  // Subtitle
  ctx.fillStyle = textMuted;
  ctx.font = 'italic 300 16px "Jost", sans-serif';
  ctx.fillText('Atelier de Parfum Digital', W / 2, y);
  y += 50;

  // --- DIVIDER LINE ---
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(px + 40, y);
  ctx.lineTo(W - px - 40, y);
  ctx.stroke();
  y += 55;

  // --- FRAGRANCE NAME (script) ---
  ctx.fillStyle = textScript;
  ctx.font = '400 58px "Maison", cursive';
  ctx.fillText(f.fragranceName || '—', W / 2, y);
  y += 34;

  // Concentration
  ctx.fillStyle = textMuted;
  ctx.font = '300 13px "Jost", sans-serif';
  // Manual letter spacing for small caps
  const concText = (f.concentration || 'Eau de Parfum').toUpperCase();
  drawSpacedText(ctx, concText, W / 2, y, 4);
  y += 28;

  // Family
  ctx.fillStyle = textDark;
  ctx.font = 'italic 400 20px "Jost", sans-serif';
  ctx.fillText(f.family || '—', W / 2, y);
  y += 55;

  ctx.textAlign = 'left';

  // --- NOTES SECTIONS ---
  function drawNotesSection(label, notes) {
    // Divider above
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(W - px, y);
    ctx.stroke();
    y += 28;

    // Label
    ctx.fillStyle = textLabel;
    ctx.font = '300 11px "Jost", sans-serif';
    drawSpacedText(ctx, label.toUpperCase(), px, y, 3, 'left');
    y += 30;

    // Notes
    ctx.fillStyle = textDark;
    ctx.font = '400 26px "Jost", sans-serif';
    const joined = (notes && notes.length) ? notes.join('   ·   ') : '—';
    ctx.fillText(joined, px, y);
    y += 40;
  }

  drawNotesSection('Notes de tête', f.olfactoryPyramid?.top);
  drawNotesSection('Notes de cœur', f.olfactoryPyramid?.heart);
  drawNotesSection('Notes de fond', f.olfactoryPyramid?.base);

  y += 15;

  // --- DIVIDER ---
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(px, y);
  ctx.lineTo(W - px, y);
  ctx.stroke();
  y += 35;

  // --- CHARACTER GRID (2x2) ---
  const gridItems = [
    { label: 'HUMEUR', value: f.character?.mood || '—' },
    { label: 'LONGÉVITÉ', value: (f.character?.longevityHours || 0).toFixed(1) + ' h' },
    { label: 'PROJECTION', value: projectionLabel(f.character?.projection || 0.5) },
    { label: 'INTENSITÉ', value: Math.round((f.character?.intensity || 0.5) * 100) + '%' }
  ];
  const colW = (W - px * 2) / 2;
  gridItems.forEach((item, i) => {
    const cx = px + (i % 2) * colW;
    const cy = y + Math.floor(i / 2) * 68;

    ctx.fillStyle = textLabel;
    ctx.font = '300 11px "Jost", sans-serif';
    drawSpacedText(ctx, item.label, cx, cy, 3, 'left');

    ctx.fillStyle = textDark;
    ctx.font = '400 26px "Jost", sans-serif';
    ctx.fillText(item.value, cx, cy + 28);
  });

  y += 155;

  // --- BOTTOM DIVIDER ---
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(px, y);
  ctx.lineTo(W - px, y);
  ctx.stroke();
  y += 35;

  // --- BATCH ROW ---
  ctx.fillStyle = textMuted;
  ctx.font = '400 14px "Jost", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((f.batch?.batchCode || '—'), px, y);
  ctx.fillText('Édition ' + (f.batch?.editionSize || '—'), px, y + 22);

  // Paris · 2026 on the right
  ctx.textAlign = 'right';
  ctx.font = '300 13px "Jost", sans-serif';
  drawSpacedText(ctx, 'PARIS · 2026', W - px - 40, y + 5, 2, 'right');

  // --- CIRCULAR SEAL ---
  const sealX = W - px - 35;
  const sealY = y + 15;
  const sealR = 32;

  // Outer ring
  ctx.strokeStyle = sealColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR - 5, 0, Math.PI * 2);
  ctx.stroke();

  // Seal text - "MAISON" on top curve
  ctx.fillStyle = sealColor;
  ctx.font = '300 8px "Jost", sans-serif';
  ctx.textAlign = 'center';
  drawTextOnArc(ctx, 'MAISON', sealX, sealY, sealR - 12, -Math.PI * 0.75, -Math.PI * 0.25);

  // "sillage" in center
  ctx.font = '400 16px "Jost", sans-serif';
  ctx.fillText('Sillage', sealX, sealY + 5);

  ctx.textAlign = 'left';

  // --- DOWNLOAD ---
  const slug = (f.fragranceName || 'fragrance').toLowerCase().replace(/\s+/g, '-');
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maison-sillage_${slug}_2026.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.95);
}

// Helper: draw text with manual letter spacing
function drawSpacedText(ctx, text, x, y, spacing, align) {
  if (align === 'right') {
    let totalW = 0;
    for (let i = 0; i < text.length; i++) {
      totalW += ctx.measureText(text[i]).width + (i < text.length - 1 ? spacing : 0);
    }
    x -= totalW;
  } else if (align === 'center' || ctx.textAlign === 'center') {
    let totalW = 0;
    for (let i = 0; i < text.length; i++) {
      totalW += ctx.measureText(text[i]).width + (i < text.length - 1 ? spacing : 0);
    }
    x -= totalW / 2;
  }
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += ctx.measureText(text[i]).width + spacing;
  }
  ctx.textAlign = prevAlign;
}

// Helper: draw text along an arc
function drawTextOnArc(ctx, text, cx, cy, radius, startAngle, endAngle) {
  const totalAngle = endAngle - startAngle;
  const angleStep = totalAngle / (text.length - 1 || 1);
  ctx.save();
  for (let i = 0; i < text.length; i++) {
    const angle = startAngle + i * angleStep;
    const tx = cx + radius * Math.cos(angle);
    const ty = cy + radius * Math.sin(angle);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function updateCellarCount() {
  try {
    const cellar = JSON.parse(localStorage.getItem('maisonsillage-cellar') || '[]');
    const el = document.getElementById('cellar-count');
    if (cellar.length > 0) {
      el.textContent = `${cellar.length} flacon${cellar.length > 1 ? 's' : ''} en cave`;
    }
  } catch(e) {}
}

updateCellarCount();

// Preload custom fonts for canvas rendering
try {
  document.fonts.load('400 52px "Maison"');
  document.fonts.load('400 26px "Jost"');
} catch(e) {}