const API_BASE = "https://ecobackend-two.vercel.app";

/**
 * Universal API helper
 * - Always returns JSON
 * - Handles errors properly
 */
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorData = {};

      try {
        errorData = await response.json();
      } catch (_) {}

      throw new Error(
        errorData.error ||
        errorData.message ||
        `HTTP Error: ${response.status}`
      );
    }

    // ✅ Always return JSON here (NO .json() outside needed)
    const data = await response.json();
    return data;

  } catch (error) {
    console.error("❌ API Fetch Error:", error);
    throw error;
  }
};