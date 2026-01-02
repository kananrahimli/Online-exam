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

const examSchema = z.object({
  title: z.string().min(3, "Başlıq minimum 3 simvoldan ibarət olmalıdır"),
  description: z.string().optional(),
  subject: z.string().min(2, "Fənn adı lazımdır"),
  level: z.string().min(1, "Səviyyə lazımdır"),
  duration: z
    .enum(["60", "120", "180"], {
      errorMap: () => ({ message: "Müddət seçilməlidir" }),
    })
    .transform((val) => parseInt(val)),
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

  useEffect(() => {
    initialize();
    if (!token) {
      router.push("/login");
      return;
    }

    fetchExam();
  }, [token, router, initialize, examId]);

  const fetchExam = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/exams/${examId}`);
      const exam = response.data;

      // Transform exam data to form format
      const formData: ExamFormData = {
        title: exam.title || "",
        description: exam.description || "",
        subject: exam.subject || "",
        level: exam.level || "",
        duration: exam.duration?.toString() as "60" | "120" | "180" | undefined,
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
                };
              })
            : [],
      };

      console.log("Sending exam data:", examData);
      const response = await api.put(`/exams/${examId}`, examData);
      console.log("Response:", response);
      router.push(`/exams/my-exams`);
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
            href="/exams/my-exams"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            ← İmtahanlarım
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

            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Suallar</h3>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
                >
                  + Sual Əlavə Et
                </button>
              </div>

              {questionFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Hələ heç bir sual əlavə edilməyib</p>
                  <p className="text-sm mt-2">
                    Yuxarıdakı düyməyə klik edərək sual əlavə edin
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {questionFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-semibold text-gray-900">
                          Sual {index + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Sil
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sual Tipi
                          </label>
                          <select
                            {...register(`questions.${index}.type`)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 appearance-none bg-no-repeat bg-right pr-8"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                              backgroundSize: "14px 14px",
                              backgroundPosition: "right 8px center",
                            }}
                          >
                            <option value={QuestionType.MULTIPLE_CHOICE}>
                              Test sualı
                            </option>
                            <option value={QuestionType.OPEN_ENDED}>
                              Açıq sual
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sual Mətni *
                          </label>
                          <textarea
                            {...register(`questions.${index}.content`)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                            placeholder="Sualı yazın..."
                          />
                          {errors.questions?.[index]?.content && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.questions[index]?.content?.message}
                            </p>
                          )}
                        </div>

                        {watch(`questions.${index}.type`) ===
                          QuestionType.MULTIPLE_CHOICE && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Variantlar *
                            </label>
                            <div className="space-y-2">
                              {[0, 1, 2, 3].map((optIndex) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    {...register(
                                      `questions.${index}.options.${optIndex}.content`
                                    )}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                                    placeholder={`Variant ${String.fromCharCode(
                                      65 + optIndex
                                    )}`}
                                  />
                                  <input
                                    type="radio"
                                    {...register(
                                      `questions.${index}.correctAnswer`
                                    )}
                                    value={optIndex.toString()}
                                    className="w-5 h-5 text-indigo-600"
                                  />
                                  <span className="text-sm text-gray-600">
                                    Düzgün
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {watch(`questions.${index}.type`) ===
                          QuestionType.OPEN_ENDED && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nümunə Cavab (Model Answer) *
                            </label>
                            <textarea
                              {...register(`questions.${index}.modelAnswer`)}
                              rows={4}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                              placeholder="Açıq sual üçün nümunə/ideal cavabı yazın. Şagird imtahan bitdikdən sonra bu cavabı görəcək."
                            />
                            {errors.questions?.[index]?.modelAnswer && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.questions[index]?.modelAnswer?.message}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              Şagird imtahan bitdikdən sonra öz cavabını bu
                              nümunə cavabla müqayisə edə biləcək
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                href="/exams/my-exams"
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

