import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  return token || null;
}

export async function fetchServerAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    cache: options.cache || "force-cache",
    next: options.next,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - token is invalid
      throw new Error("UNAUTHORIZED");
    }
    const error = await response
      .json()
      .catch(() => ({ message: "Xəta baş verdi" }));
    throw new Error(error.message || "Xəta baş verdi");
  }

  return response.json();
}

export async function getServerUser(options?: { revalidate?: number }) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return null;
    }
    return await fetchServerAPI<any>("/auth/me", {
      cache: options?.revalidate ? "no-store" : "force-cache",
      next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return null;
    }
    throw error;
  }
}
