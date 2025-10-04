// Determine API base URL: use REACT_APP_DEV_BACKEND if running locally, else REACT_APP_API_BASE_URL
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
