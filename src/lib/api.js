const API_BASE = import.meta.env.VITE_API_URL || "https://ai-nex-model-wise-be.onrender.com";

export const api = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const { timeoutMs, signal: callerSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  callerSignal?.addEventListener("abort", abort, { once: true });
  const timeout = timeoutMs
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : null;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      credentials: "include",
      signal: controller.signal,
      headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.dispatchEvent(new Event("modelwise:unauthorized"));
    }
    if (!response.ok) throw new Error(body.error?.message || "Request failed");
    return body.data;
  } finally {
    if (timeout) window.clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abort);
  }
};
