export const API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? process.env.REACT_APP_DEV_BACKEND
    : process.env.REACT_APP_API_BASE_URL;

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
  const res = await fetch(`${API_BASE_URL}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch saved decks');
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
