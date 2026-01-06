// actions/teachers.ts
"use server";

import { fetchServerAPI } from "@/lib/server-api";
import { revalidateTag } from "next/cache";

export async function saveTeachers(
  toAdd: string[],
  toRemove: string[],
  userId?: string
) {
  try {
    // ➕ ADD
    for (const teacherId of toAdd) {
      await fetchServerAPI(`/teacher-student/${teacherId}/follow`, {
        method: "POST",
        cache: "no-store",
      });
    }

    // ➖ REMOVE
    for (const teacherId of toRemove) {
      await fetchServerAPI(`/teacher-student/${teacherId}/unfollow`, {
        method: "DELETE",
        cache: "no-store",
      });
    }

    revalidateTag(`teachers`);
  } catch (err) {
    console.error("saveTeachers error:", err);
    throw err;
  }
}
