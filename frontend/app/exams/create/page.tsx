"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { QuestionType } from "@/lib/types";
import ReadingTextEditor from "@/components/exam/ReadingTextEditor";
import QuestionEditor from "@/components/exam/QuestionEditor";
import { ROUTES } from "@/lib/constants/routes";
import { createExamAction } from "@/lib/actions/exams";

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
        content: z.string().min(10, "Mətn minimum 10 simvol olmalıdır"),
      })
    )
    .optional(),
  questions: z
    .array(
      z
        .object({
          type: z.nativeEnum(QuestionType),
          content: z.string().min(5, "Sual mətni minimum 5 simvol olmalıdır"),
          // points removed - all questions are 1 point
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

export default function CreateExamPage() {
  const router = useRouter();
  const { user, token, initialize } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    clearErrors,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      duration: undefined,
      questions: [],
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
    // Don't check token here - let the form submission handle it
    // This prevents premature redirects
  }, [initialize]);

  const onSubmit = async (data: ExamFormData) => {
    setError("");
    setLoading(true);

    try {
      // Transform data to match backend expectations
      // Ensure duration is a number
      const durationNum =
        typeof data.duration === "string"
          ? parseInt(data.duration)
          : data.duration;

      // First create reading texts to get IDs, then map questions
      // For now, we'll send reading texts first, and backend will create them and return IDs
      // We need to send readingTextId from frontend (which will be the temporary index)
      // Backend will map them properly

      const examData = {
        ...data,
        duration: durationNum,
        readingTexts: data.readingTexts || [],
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

                // Return question with readingTextId if provided
                // readingTextId will be sent as is, backend will validate
                // Convert empty string to undefined
                const readingTextId =
                  q.readingTextId && q.readingTextId.trim() !== ""
                    ? q.readingTextId
                    : undefined;

                return {
                  type: q.type,
                  content: q.content,
                  points: 1, // All questions are 1 point
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

      // const response = await api.post(API_ENDPOINTS.EXAMS.LIST, examData);
      const response = (await createExamAction(examData)) as any;

      if (response.success) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.role === "TEACHER") {
          // Teachers should go to their exams list at /exams/my-exams
          router.push("/exams/my-exams");
        } else {
          // Students go to my-exams
          router.push(ROUTES.MY_EXAMS);
        }
      }
    } catch (err: any) {
      // Handle 401 Unauthorized - token expired or invalid
      if (err.response?.status === 401) {
        setError(
          "Sessiya bitib və ya token etibarsızdır. Zəhmət olmasa yenidən giriş edin."
        );
        // Don't redirect immediately - let user see the error message
        // They can manually go to login or we redirect after 5 seconds
        setTimeout(() => {
          // Only redirect if we're still on this page
          if (
            typeof window !== "undefined" &&
            window.location.pathname.includes("/exams/create")
          ) {
            router.push(ROUTES.LOGIN);
          }
        }, 5000);
        return;
      }

      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "İmtahan yaratma zamanı xəta baş verdi";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    appendQuestion({
      type: QuestionType.MULTIPLE_CHOICE,
      content: "",
      options: [
        { content: "" },
        { content: "" },
        { content: "" },
        { content: "" },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={ROUTES.DASHBOARD}
            aria-label="İdarə panelinə qayıt"
            className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-4 font-semibold text-lg transition-colors duration-200 hover:gap-3"
          >
            <span className="text-xl" aria-hidden="true">
              ←
            </span>
            <span>İdarə panelinə qayıt</span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Yeni İmtahan Yaradın
          </h1>
          <p className="text-gray-600">Manual olaraq imtahan yaradın</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
          <form
            onSubmit={handleSubmit(onSubmit, (errors) => {
              console.log(errors);
              setError(
                "Formda xətalar var. Zəhmət olmasa bütün tələb olunan sahələri doldurun."
              );
            })}
            className="space-y-6"
          >
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
                  Sinif *
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
              onAppend={() => appendReadingText({ content: "" })}
              onRemove={removeReadingText}
            />

            <QuestionEditor
              fields={questionFields}
              register={register}
              errors={errors}
              watch={watch}
              readingTextFields={readingTextFields.map((rt, rtIndex) => ({
                id: rt.id || `temp_${rtIndex}`,
              }))}
              onAppend={addQuestion}
              onRemove={removeQuestion}
            />

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                href={ROUTES.DASHBOARD}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Ləğv et
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? "Yadda saxlanılır..." : "İmtahanı Yadda Saxla"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
