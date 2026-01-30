const rewriteApiUrl = (input: RequestInfo | URL) => {
  const baseUrl = import.meta.env.VITE_API_BASE;
  if (!baseUrl) return input;
  if (typeof input === "string" && input.startsWith("/api/")) {
    return `${baseUrl}${input.replace(/^\/api/, "")}`;
  }
  if (input instanceof URL && input.pathname.startsWith("/api/")) {
    return new URL(input.toString().replace(/\/api(\/|$)/, "/"));
  }
  return input;
};

const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const rewrittenInput = rewriteApiUrl(input);
  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined)
  );
  const response = await originalFetch(rewrittenInput, {
    ...init,
    headers
  });

  return response;
};
