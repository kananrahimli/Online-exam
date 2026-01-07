"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { QuestionType } from "@/lib/types";
import ReadingTextEditor from "@/components/exam/ReadingTextEditor";
import QuestionEditor from "@/components/exam/QuestionEditor";
import { API_ENDPOINTS, ROUTES } from "@/lib/constants/routes";
import { updateExamAction } from "@/lib/actions/exams";

const examSchema = z.object({
  title: z.string().min(3, "Başlıq minimum 3 simvoldan ibarət olmalıdır"),
  description: z.string().optional(),
  subject: z.string().min(2, "Fənn adı lazımdır"),
  level: z.string().min(1, "Sinif lazımdır"),
  duration: z
    .enum(["60", "120", "180"], {
      errorMap: () => ({ message: "Müddət seçilməlidir" }),
    })
    .transform((val) => parseInt(val)),
  readingTexts: z
    .array(
      z.object({
        content: z.string().min(1, "Mətni daxil edin!"),
        id: z.string().optional(),
      })
    )
    .optional(),
  topics: z
    .array(
      z.object({
        name: z.string().min(1, "Mövzu adı lazımdır"),
        questions: z.array(
          z.object({
            type: z.nativeEnum(QuestionType),
            content: z.string().min(5, "Sual mətni minimum 5 simvol olmalıdır"),
            points: z.number().min(1).default(1),
            options: z
              .array(
                z.object({
                  content: z.string().min(1, "Variant mətni lazımdır"),
                })
              )
              .optional(),
            correctAnswer: z.string().optional(),
            modelAnswer: z.string().optional(),
            readingTextId: z.string().optional(),
          })
        ),
      })
    )
    .optional(),
  questions: z
    .array(
      z
        .object({
          type: z.nativeEnum(QuestionType),
          content: z.string().min(5, "Sual mətni minimum 5 simvol olmalıdır"),
          points: z.number().min(1).default(1),
          options: z
            .array(
              z.object({
                content: z.string(),
              })
            )
            .optional(),
          correctAnswer: z.string().nullable().optional(),
          modelAnswer: z.string().optional(),
          readingTextId: z.string().optional(),
        })
        .refine(
          (data) => {
            // Test sualları üçün ən azı 2 variant və correctAnswer lazımdır
            if (data.type === QuestionType.MULTIPLE_CHOICE) {
              const validOptions =
                data.options?.filter(
                  (opt) => opt.content && opt.content.trim().length > 0
                ) || [];
              return (
                validOptions.length >= 2 &&
                data.correctAnswer !== null &&
                data.correctAnswer !== undefined
              );
            }
            // Açıq suallar üçün model answer lazımdır
            if (data.type === QuestionType.OPEN_ENDED) {
              return data.modelAnswer && data.modelAnswer.trim().length > 0;
            }
            return true;
          },
          (data) => {
            if (data.type === QuestionType.MULTIPLE_CHOICE) {
              return {
                message:
                  "Test sualları üçün ən azı 2 variant və düzgün cavab seçilməlidir",
                path: ["options"],
              };
            }
            return {
              message: "Açıq suallar üçün nümunə cavab lazımdır",
              path: ["modelAnswer"],
            };
          }
        )
    )
    .optional(),
});

type ExamFormData = z.infer<typeof examSchema>;

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  const { user, token, initialize } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      duration: undefined,
      questions: [],
      topics: [],
      readingTexts: [],
    },
  });

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({
    control,
    name: "questions",
  });

  const {
    fields: readingTextFields,
    append: appendReadingText,
    remove: removeReadingText,
  } = useFieldArray({
    control,
    name: "readingTexts",
  });

  useEffect(() => {
    initialize();

    // Check token after a short delay to allow initialize to complete
    const checkAuth = setTimeout(() => {
      const currentToken = useAuthStore.getState().token;
      const tokenFromStorage =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      // Only redirect if token is truly missing from both store and localStorage
      // And only if we're still on this page (not already redirecting)
      if (
        !currentToken &&
        !tokenFromStorage &&
        window.location.pathname.includes("/edit")
      ) {
        router.push("/login");
        return;
      }

      // If token exists, fetch exam
      if (currentToken || tokenFromStorage) {
        fetchExam();
      }
    }, 100);

    return () => clearTimeout(checkAuth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const fetchExam = async () => {
    try {
      setFetching(true);
      const response = await api.get(API_ENDPOINTS.EXAMS.DETAIL(examId));
      const exam = response.data;

      // Transform exam data to form format
      const formData: any = {
        title: exam.title || "",
        description: exam.description || "",
        subject: exam.subject || "",
        level: exam.level || "",
        duration:
          exam.duration === 60
            ? "60"
            : exam.duration === 120
            ? "120"
            : exam.duration === 180
            ? "180"
            : undefined,
        readingTexts: exam.readingTexts
          ? exam.readingTexts.map((rt: any) => ({
              id: rt.id,
              content: rt.content || "",
            }))
          : [],
        questions: exam.questions
          ? exam.questions.map((q: any) => {
              // For multiple choice questions, ensure we have 4 options
              let options: { content: string }[] = [];
              if (q.type === QuestionType.MULTIPLE_CHOICE && q.options) {
                options = q.options
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((opt: any) => ({
                    content: opt.content || "",
                  }));
                // Pad with empty options if less than 4
                while (options.length < 4) {
                  options.push({ content: "" });
                }
              }

              return {
                type: q.type,
                content: q.content || "",
                points: q.points || 1,
                options: options,
                correctAnswer: q.correctAnswer?.toString() || null,
                modelAnswer: q.modelAnswer || "",
                readingTextId: q.readingTextId || undefined,
              };
            })
          : [],
      };

      reset(formData);
    } catch (err: any) {
      console.error("Error fetching exam:", err);
      setError(
        err.response?.data?.message || "İmtahan yüklənərkən xəta baş verdi"
      );
      router.push("/exams/my-exams");
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: ExamFormData) => {
    setError("");
    setLoading(true);

    try {
      console.log("Form data:", data);

      // Transform data to match backend expectations
      const durationNum =
        typeof data.duration === "string"
          ? parseInt(data.duration)
          : data.duration;

      const examData = {
        ...data,
        duration: durationNum,
        readingTexts: data.readingTexts?.map((rt, index) => ({
          content: rt.content,
          id: rt.id || `temp-reading-text-${index}`,
        })),
        questions:
          data.questions && data.questions.length > 0
            ? data.questions.map((q) => {
                // Filter out empty options for test questions
                const filteredOptions =
                  q.type === QuestionType.MULTIPLE_CHOICE && q.options
                    ? q.options
                        .filter(
                          (opt) => opt.content && opt.content.trim().length > 0
                        )
                        .map((opt) => ({
                          content: opt.content.trim(),
                        }))
                    : undefined;

                // Handle correctAnswer - convert null to undefined
                const correctAnswer =
                  q.correctAnswer && q.correctAnswer !== null
                    ? q.correctAnswer
                    : undefined;

                // Return question without order field - backend will handle ordering
                // Convert empty string to undefined
                const readingTextId =
                  q.readingTextId && q.readingTextId.trim() !== ""
                    ? q.readingTextId
                    : undefined;

                return {
                  type: q.type,
                  content: q.content,
                  points: q.points || 1,
                  options: filteredOptions,
                  correctAnswer:
                    q.type === QuestionType.MULTIPLE_CHOICE
                      ? correctAnswer
                      : undefined,
                  modelAnswer: q.modelAnswer || undefined,
                  readingTextId: readingTextId,
                };
              })
            : [],
      };

      const response = await updateExamAction(examId, examData);
      if (response.success) {
        router.push("/exams/my-exams");
      }
    } catch (err: any) {
      console.error("Error updating exam:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "İmtahan yenilənərkən xəta baş verdi";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    appendQuestion({
      type: QuestionType.MULTIPLE_CHOICE,
      content: "",
      points: 1,
      options: [
        { content: "" },
        { content: "" },
        { content: "" },
        { content: "" },
      ],
    });
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">İmtahan yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={ROUTES.MY_EXAMS}
            aria-label="İmtahanlarım səhifəsinə qayıt"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <span aria-hidden="true">←</span> İmtahanlarım
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            İmtahanı Redaktə Et
          </h1>
          <p className="text-gray-600">İmtahan məlumatlarını yeniləyin</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
          <form
            onSubmit={handleSubmit(onSubmit, (errors) => {
              console.error("Validation errors:", errors);
              setError(
                "Formda xətalar var. Zəhmət olmasa bütün tələb olunan sahələri doldurun."
              );
            })}
            className="space-y-6"
          >
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  İmtahan Başlığı *
                </label>
                <input
                  {...register("title")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  placeholder="Məs: Riyaziyyat - 9-cu sinif"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fənn *
                </label>
                <input
                  {...register("subject")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  placeholder="Məs: Riyaziyyat"
                />
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Səviyyə *
                </label>
                <input
                  {...register("level")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  placeholder="Məs: 9-cu sinif"
                />
                {errors.level && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.level.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Müddət *
                </label>
                <select
                  {...register("duration")}
                  onChange={(e) => {
                    register("duration").onChange(e);
                    if (e.target.value && e.target.value !== "") {
                      clearErrors("duration");
                      trigger("duration");
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 appearance-none bg-no-repeat bg-right pr-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundSize: "16px 16px",
                    backgroundPosition: "right 12px center",
                  }}
                >
                  <option value="">Müddət seçin</option>
                  <option value="60">1 saat (60 dəqiqə) - 3 AZN</option>
                  <option value="120">2 saat (120 dəqiqə) - 5 AZN</option>
                  <option value="180">3 saat (180 dəqiqə) - 10 AZN</option>
                </select>
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.duration.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Qiymət
                </label>
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
                  {(() => {
                    const duration = watch("duration");
                    const durationNum =
                      typeof duration === "string"
                        ? parseInt(duration)
                        : duration;
                    if (durationNum === 60) return "3 AZN";
                    if (durationNum === 120) return "5 AZN";
                    if (durationNum === 180) return "10 AZN";
                    return "Müddət seçin";
                  })()}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Qiymət avtomatik olaraq müddətə görə hesablanır
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Təsvir
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                placeholder="İmtahan haqqında qısa məlumat"
              />
            </div>

            <ReadingTextEditor
              fields={readingTextFields}
              register={register}
              errors={errors}
              onAppend={() => appendReadingText({ content: "", id: undefined })}
              onRemove={removeReadingText}
            />

            <QuestionEditor
              fields={questionFields}
              register={register}
              errors={errors}
              watch={watch}
              readingTextFields={readingTextFields}
              onAppend={addQuestion}
              onRemove={removeQuestion}
            />

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                href={ROUTES.MY_EXAMS}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Ləğv et
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? "Yenilənir..." : "Dəyişiklikləri Yadda Saxla"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
