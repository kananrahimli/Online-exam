import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  return token || null;
}

export async function fetchServerAPI<T>(
  endpoint: string,
  options: RequestInit & {
    next?: { tags?: string[]; revalidate?: number };
  } = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Extract next option for Next.js cache
  const { next, ...fetchOptions } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers: headers as HeadersInit,
    cache: options.cache || "force-cache",
    ...(next && { next }),
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

export async function getServerUser(options?: {
  revalidate?: number;
  tags?: string[];
}) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return null;
    }
    return await fetchServerAPI<any>("/auth/me", {
      next: options?.tags
        ? { tags: options.tags }
        : options?.revalidate
        ? { revalidate: options.revalidate }
        : undefined,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return null;
    }
    throw error;
  }
}
