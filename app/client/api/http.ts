/** Client-safe typed API helper. Client components must call route handlers, not import app/server modules. */
export interface ApiErrorPayload { error?: string }

export function getApiJson<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, init).then((response) =>
    response.json().catch(() => null).then((payload: unknown) => {
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : `Request failed (${response.status}).`;
        throw new Error(message);
      }
      return payload as T;
    }),
  );
}
