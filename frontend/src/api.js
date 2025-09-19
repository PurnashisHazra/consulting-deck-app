export async function generateSlides(data, token) {
    const ep = '/generate_slides';
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}${ep}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" , 'Authorization': `Bearer ${token}`},
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to generate slides");
    return await response.json();
  }
  