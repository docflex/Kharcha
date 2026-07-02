export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    const json = await res.json();

    if (!res.ok) {
        const errorMsg = json.error || `Request failed (${res.status})`;
        const errorCode = json.code;
        console.error(
            `[api] ${options?.method || "GET"} ${url} → ${res.status}: ${errorMsg}${errorCode ? ` [${errorCode}]` : ""}`
        );
        throw new ApiError(errorMsg, res.status, errorCode);
    }

    return json.data as T;
}

export const apiClient = {
    get<T>(url: string): Promise<T> {
        return request<T>(url);
    },

    post<T>(url: string, body: unknown): Promise<T> {
        return request<T>(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    },

    patch<T>(url: string, body: unknown): Promise<T> {
        return request<T>(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    },

    delete<T = void>(url: string): Promise<T> {
        return request<T>(url, { method: "DELETE" });
    },

    postForm<T>(url: string, formData: FormData): Promise<T> {
        return request<T>(url, { method: "POST", body: formData });
    },
};
