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
  document.getElementById('screen-' + screenId).classList.add('active');
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
  
  const fragrance = await callClaude();
  
  await new Promise(r => setTimeout(r, 3200));
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
  
  // Fill bottle — body bottom at y=216, height=154
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
    
    // Fill liquid — bottle body: y=62 to y=216, height=154
    const fillH = Math.min((i / genMessages.length) * 144, 144);
    liquid.setAttribute('y', String(216 - fillH));
    liquid.setAttribute('height', String(fillH));
    // Sync shine stripe
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    // Fallback
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
  
  // Update CSS accent
  document.documentElement.style.setProperty('--accent-hue', hue);
  
  // Update bottle liquid color
  document.getElementById('liquidTop').setAttribute('stop-color', `hsl(${hue},40%,72%)`);
  document.getElementById('liquidBot').setAttribute('stop-color', `hsl(${hue},46%,46%)`);
  document.getElementById('gen-liquid').setAttribute('fill', `hsl(${hue},40%,70%)`);
  
  // Card content
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

// ══════════════════════════════════════════ ARCHIVE / DOWNLOAD
function downloadCard() {
  if (!currentFragrance) return;
  
  // Save to localStorage cellar
  try {
    const cellar = JSON.parse(localStorage.getItem('maisonsb-cellar') || '[]');
    cellar.push({ ...currentFragrance, savedAt: Date.now() });
    localStorage.setItem('maisonsb-cellar', JSON.stringify(cellar));
    updateCellarCount();
  } catch(e) {}
  
  // Download JSON
  const blob = new Blob([JSON.stringify(currentFragrance, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = (currentFragrance.fragranceName || 'fragrance').toLowerCase().replace(/\s+/g, '-');
  a.href = url;
  a.download = `maison-sb_${slug}_2026.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function updateCellarCount() {
  try {
    const cellar = JSON.parse(localStorage.getItem('maisonsb-cellar') || '[]');
    const el = document.getElementById('cellar-count');
    if (cellar.length > 0) {
      el.textContent = `${cellar.length} flacon${cellar.length > 1 ? 's' : ''} en cave`;
    }
  } catch(e) {}
}

updateCellarCount();