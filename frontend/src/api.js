export const API_BASE_URL = (() => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) return process.env.REACT_APP_DEV_BACKEND || 'http://localhost:8000';
  return process.env.REACT_APP_API_BASE_URL || `${window.location.protocol}//${window.location.host}`;
})();

export async function generateSlides(data, token) {
    const ep = '/generate_slides';
    const response = await fetch(`${API_BASE_URL}${ep}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" , 'Authorization': `Bearer ${token}`},
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to generate slides");
    return await response.json();
  }

// Multi-step generation with live updates (NDJSON stream)
export async function generateSlidesMultiStepStream(data, token, onEvent) {
  const ep = '/generate_slides_multi_step_stream';
  const response = await fetch(`${API_BASE_URL}${ep}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const txt = await response.text().catch(() => null);
    throw new Error(`Failed to generate slides (stream): ${response.status} ${txt || ''}`);
  }
  if (!response.body) throw new Error('Streaming not supported in this environment.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalDeck = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let msg = null;
      try {
        msg = JSON.parse(trimmed);
      } catch (e) {
        continue;
      }
      if (!msg || typeof msg !== 'object') continue;
      if (msg.type === 'done' && msg.payload && msg.payload.deck) {
        finalDeck = msg.payload.deck;
      }
      if (typeof onEvent === 'function') onEvent(msg);
    }
  }

  const trimmed = buffer.trim();
  if (trimmed) {
    try {
      const msg = JSON.parse(trimmed);
      if (msg?.type === 'done' && msg?.payload?.deck) finalDeck = msg.payload.deck;
      if (typeof onEvent === 'function') onEvent(msg);
    } catch (e) {}
  }

  if (!finalDeck) throw new Error('Stream ended without a final deck.');
  return finalDeck;
}
  
export async function getPalette() {
  const ep = '/palette';
  const res = await fetch(`${API_BASE_URL}${ep}`);
  if (!res.ok) {
    throw new Error('Failed to fetch palette');
  }
  return await res.json();
}

export async function fetchSavedDecks(token) {
  const ep = '/my_decks';
  const url = `${API_BASE_URL}${ep}`;
  // helpful debug log when devtools/console is available
  if (typeof console !== 'undefined') console.debug('[api] fetchSavedDecks ->', url);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    const errMsg = `Failed to fetch saved decks: ${res.status} ${txt || ''}`;
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function saveDeck(deck, token) {
  const ep = '/save_deck';
  const res = await fetch(`${API_BASE_URL}${ep}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(deck),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(`Failed to save deck: ${res.status} ${txt || ''}`);
  }
  return await res.json();
}

export async function suggestInfographics(payload, token) {
  const ep = '/suggest_infographics';
  const res = await fetch(`${API_BASE_URL}${ep}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(`Failed to suggest infographics: ${res.status} ${txt || ''}`);
  }
  return await res.json();
}

export async function generateFrameworkData(payload, token) {
  const ep = '/generate_framework_data';
  const res = await fetch(`${API_BASE_URL}${ep}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(`Failed to generate framework data: ${res.status} ${txt || ''}`);
  }
  return await res.json();
}
