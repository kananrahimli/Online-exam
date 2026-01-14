import { cookies } from "next/headers";

// Server-side API URL - Docker-də backend service name istifadə edir
// NEXT_PUBLIC_INTERNAL_API_URL Docker-də backend container name-dır
// fallback olaraq NEXT_PUBLIC_API_URL (browser üçün)
const API_URL = process.env.NEXT_PUBLIC_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

// Next.js 14.x üçün - cookies() SYNC-dir!
export function getAuthToken(): string | null {
  try {
    const cookieStore = cookies();  // await YOX!
    const token = cookieStore.get("token")?.value;
    return token || null;
  } catch (error) {
    console.error("Cookie oxuma xətası:", error);
    return null;
  }
}

// Alternative: Headers-dan oxumaq
import { headers } from "next/headers";

export function getAuthTokenFromHeaders(): string | null {
  try {
    const headersList = headers();  // await YOX! (Next.js 14)
    const cookie = headersList.get("cookie");
    
    if (!cookie) return null;
    
    const tokenMatch = cookie.match(/token=([^;]+)/);
    return tokenMatch ? tokenMatch[1] : null;
  } catch (error) {
    console.error("Headers oxuma xətası:", error);
    return null;
  }
}

export async function fetchServerAPI<T>(
  endpoint: string,
  options: RequestInit & {
    next?: { tags?: string[]; revalidate?: number };
  } = {}
): Promise<T> {
  // Token-i al (sync)
  let token = getAuthToken();
  
  // Əgər yoxdursa, headers-dan cəhd et
  if (!token) {
    token = getAuthTokenFromHeaders();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { next, ...fetchOptions } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers: headers as HeadersInit,
    cache: options.cache || "force-cache",
    ...(next && { next }),
  });

  if (!response.ok) {
    if (response.status === 401) {
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
    const token = getAuthToken();  // sync
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
    console.error("getServerUser xətası:", error);
    throw error;
  }
}