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
