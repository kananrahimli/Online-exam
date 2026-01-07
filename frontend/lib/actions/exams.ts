"use server";

import { revalidateTag } from "next/cache";
import { fetchServerAPI } from "../server-api";

export async function createExamAction(examData: any) {
  const result = await fetchServerAPI("/exams", {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify(examData),
  });

  revalidateTag("exams");

  return {
    success: true,
    result: result,
  };
}
export async function updateExamAction(examId: string, examData: any) {
  const result = await fetchServerAPI(`/exams/${examId}`, {
    method: "PUT",
    cache: "no-store",
    body: JSON.stringify(examData),
  });

  revalidateTag("exams");

  return {
    success: true,
    result: result,
  };
}

export async function publishExamAction(examId: string) {
  const result = await fetchServerAPI(`/exams/${examId}/publish`, {
    method: "POST",
    cache: "no-store",
  });

  revalidateTag("exams");

  return {
    success: true,
    result: result,
  };
}

export async function deleteExamAction(examId: string) {
  const result = await fetchServerAPI(`/exams/${examId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  revalidateTag("exams");

  return {
    success: true,
    result: result,
  };
}
