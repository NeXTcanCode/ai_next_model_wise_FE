const API_BASE = import.meta.env.VITE_API_URL || "";
let memoryToken = null;
export const setAuthToken = (token) => { memoryToken = token || null; };
export const clearAuthToken = () => { memoryToken = null; };

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
      ...(memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {}),
      ...(options.headers || {}),
    },
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event("modelwise:unauthorized"));
    }
    if (!response.ok) throw new Error(body.error?.message || "Request failed");
    return body.data;
  } finally {
    if (timeout) window.clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abort);
  }
};

// Streaming counterpart to api(). The backend responds with either a plain
// JSON envelope (validation errors, the identity-question shortcut, or a
// hard failure before any model was reached) or a text/event-stream body
// carrying { delta } / { done, ... } / { error, message } frames. Either
// shape is normalized into the same onDelta/onDone/onError callbacks so
// callers don't need to know which path the backend took.
export const apiStream = async (path, options = {}, { onDelta, onDone, onError } = {}) => {
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
        ...(memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event("modelwise:unauthorized"));
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message || "Request failed");
      if (body.data?.response) onDelta?.(body.data.response);
      onDone?.(body.data || {});
      return;
    }
    if (!response.ok || !response.body) throw new Error("Request failed");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let leftover = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      leftover += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = leftover.indexOf("\n\n")) !== -1) {
        const rawEvent = leftover.slice(0, idx).trim();
        leftover = leftover.slice(idx + 2);
        if (!rawEvent.startsWith("data:")) continue;
        const payload = rawEvent.slice(5).trim();
        if (!payload) continue;
        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        if (json.error) {
          onError?.(json.message || "Request failed");
          return;
        }
        if (json.done) {
          onDone?.(json);
          return;
        }
        if (json.delta) onDelta?.(json.delta);
      }
    }
  } finally {
    if (timeout) window.clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abort);
  }
};
