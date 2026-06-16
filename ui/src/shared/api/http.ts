export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }
  return base.replace(/\/$/, "");
}

export async function httpGet<T>(path: string): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  let body: unknown = null;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = text.length > 0 ? text : null;
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : `Request failed with status ${response.status}`;
    throw new HttpError(message, response.status, body);
  }

  return body as T;
}

export async function httpPost<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let responseBody: unknown = null;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    responseBody = await response.json();
  } else {
    const text = await response.text();
    responseBody = text.length > 0 ? text : null;
  }

  if (!response.ok) {
    const message = extractErrorMessage(responseBody, response.status);
    throw new HttpError(message, response.status, responseBody);
  }

  return responseBody as TResponse;
}

function extractErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === "string") {
      return record.detail;
    }
    if (Array.isArray(record.detail)) {
      const parts = record.detail
        .map((item) => {
          if (typeof item === "object" && item !== null && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return String(item);
        })
        .filter(Boolean);
      if (parts.length > 0) {
        return parts.join("; ");
      }
    }
  }
  return `Request failed with status ${status}`;
}
