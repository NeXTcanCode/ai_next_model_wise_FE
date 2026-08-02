const API_BASE = import.meta.env.VITE_API_URL || "https://ai-nex-model-wise-be.onrender.com";

export const api = async (path, options = {}) => {
  const token = localStorage.getItem("modelwise_session");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || "Request failed");
  return body.data;
};
