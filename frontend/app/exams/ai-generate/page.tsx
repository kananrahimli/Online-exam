"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import Link from "next/link";
import { QuestionType } from "@/lib/types";
import QuestionTypeMultiSelect from "@/components/QuestionTypeMultiSelect";

const aiGenerateSchema = z
  .object({
    subject: z.string().min(2, "Fənn adı lazımdır"),
    level: z.string().min(1, "Sinif lazımdır"),
    topic: z.string().min(2, "Mövzu lazımdır"),
    questionCount: z
      .number({
        required_error: "Sual sayı lazımdır",
        invalid_type_error: "Sual sayı rəqəm olmalıdır",
      })
      .min(1, "Sual sayı minimum 1 olmalıdır")
      .max(100, "Sual sayı maksimum 100 ola bilər"),
    questionTypes: z
      .array(z.nativeEnum(QuestionType))
      .min(1, "Ən azı bir sual tipi seçilməlidir"),
    readingText: z.string().optional(),
    readingQuestionCount: z
      .number({
        invalid_type_error: "Sual sayı rəqəm olmalı və daxil edilməlidir!",
      })
      .min(1, "Sual sayı minimum 1 olmalıdır")
      .max(50, "Sual sayı maksimum 50 ola bilər")
      .optional(),
    title: z.string().min(3, "Başlıq lazımdır"),
    duration: z
      .enum(["60", "120", "180"], {
        errorMap: () => ({ message: "Müddət seçilməlidir" }),
      })
      .transform((val) => parseInt(val)),
  })

  .refine(
    (data) => {
      // readingQuestionCount üçün ayrıca yoxlama
      if (data.questionTypes?.includes(QuestionType.READING_COMPREHENSION)) {
        return (
          data.readingQuestionCount !== undefined &&
          data.readingQuestionCount !== null &&
          !isNaN(data.readingQuestionCount) &&
          data.readingQuestionCount > 0
        );
      }
      return true;
    },
    {
      message: "Mətndən yaradılacaq sual sayı göstərilməlidir",
      path: ["readingQuestionCount"],
    }
  );

type AIGenerateFormData = z.infer<typeof aiGenerateSchema>;

export default function AIGenerateExamPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedExam, setGeneratedExam] = useState<any>(null);
  const [step, setStep] = useState<"form" | "review">("form");
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<
    number | null
  >(null);
  const [editingReadingText, setEditingReadingText] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<AIGenerateFormData>({
    resolver: zodResolver(aiGenerateSchema),
    defaultValues: {
      questionCount: 10,
      questionTypes: [QuestionType.MULTIPLE_CHOICE],
    },
  });

  const selectedQuestionTypes = watch("questionTypes") || [];

  const onSubmit = async (data: AIGenerateFormData) => {
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/ai/generate-exam", {
        subject: data.subject,
        level: data.level,
        topic: data.topic,
        questionCount: data.questionCount,
        questionTypes: data.questionTypes,
        readingText: data.readingText,
        readingQuestionCount: data.readingQuestionCount,
      });

      // Format response to match manual exam creation format
      // Backend now returns readingTexts array instead of readingText string
      const formattedExam = {
        ...response.data,
        title: data.title,
        description: `${data.subject} - Sinif ${data.level} səviyyəsi, ${data.topic} mövzusu`,
        duration: data.duration,
        // Extract readingText from readingTexts array for display
        readingText:
          response.data.readingTexts?.[0]?.content ||
          response.data.readingText ||
          "",
        // Keep readingTexts array for saving
        readingTexts:
          response.data.readingTexts ||
          (response.data.readingText
            ? [{ content: response.data.readingText }]
            : []),
      };

      setGeneratedExam(formattedExam);

      setStep("review");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "AI ilə imtahan yaratma zamanı xəta baş verdi"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (questionIndex: number, field: string, value: any) => {
    if (!generatedExam) return;

    const updatedQuestions = [...generatedExam.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      [field]: value,
    };

    setGeneratedExam({
      ...generatedExam,
      questions: updatedQuestions,
    });
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    if (!generatedExam) return;

    const updatedQuestions = [...generatedExam.questions];
    const updatedOptions = [...updatedQuestions[questionIndex].options];
    updatedOptions[optionIndex] = {
      ...updatedOptions[optionIndex],
      content: value,
    };

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options: updatedOptions,
    };

    setGeneratedExam({
      ...generatedExam,
      questions: updatedQuestions,
    });
  };

  const setCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    if (!generatedExam) return;

    const updatedQuestions = [...generatedExam.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      correctAnswer: optionIndex.toString(),
    };

    setGeneratedExam({
      ...generatedExam,
      questions: updatedQuestions,
    });
  };

  const updateReadingText = (newText: string) => {
    if (!generatedExam) return;

    setGeneratedExam({
      ...generatedExam,
      readingText: newText,
      // Also update readingTexts array to match manual format
      readingTexts: newText ? [{ content: newText }] : [],
    });
  };

  const saveExam = async () => {
    if (!generatedExam) return;

    setLoading(true);
    try {
      // Prepare reading texts if AI generated any (now in readingTexts array format)
      const readingTexts =
        generatedExam.readingTexts ||
        (generatedExam.readingText
          ? [{ content: generatedExam.readingText }]
          : []);

      // Map questions - backend already provides them in correct format
      // Questions with readingTextId are already formatted as MULTIPLE_CHOICE or OPEN_ENDED
      const questions = generatedExam.questions?.map((q: any) => {
        const questionData: any = {
          type: q.type,
          content: q.content,
          points: q.points || 1,
          options: q.options?.map((opt: any) => ({
            content: opt.content,
          })),
          correctAnswer: q.correctAnswer,
          modelAnswer: q.modelAnswer,
          // Keep readingTextId if it exists (from backend processing)
          readingTextId: q.readingTextId,
        };

        // Remove undefined/null fields
        if (!questionData.options || questionData.options.length === 0) {
          delete questionData.options;
        }
        if (!questionData.correctAnswer && questionData.correctAnswer !== "0") {
          delete questionData.correctAnswer;
        }
        if (!questionData.modelAnswer) {
          delete questionData.modelAnswer;
        }
        if (!questionData.readingTextId) {
          delete questionData.readingTextId;
        }

        return questionData;
      });

      const examData = {
        title: generatedExam.title,
        description: generatedExam.description,
        subject: generatedExam.subject || watch("subject"),
        level: generatedExam.level || watch("level"),
        duration: generatedExam.duration,
        readingTexts: readingTexts,
        questions: questions || [],
      };

      const response = await api.post("/exams", examData);
      router.push(`/exams/my-exams`);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "İmtahan yadda saxlanma zamanı xəta baş verdi"
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === "review" && generatedExam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI İmtahanını Gözdən Keçirin
            </h1>
            <p className="text-gray-600">
              Yaradılan imtahanı yoxlayın və düzəldin
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-200 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{generatedExam.title}</h2>
              <p className="text-gray-600">{generatedExam.description}</p>
            </div>

            {/* Reading Text Section - if AI generated reading text */}
            {generatedExam.readingText && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    Oxuma Mətni
                  </h3>
                  <button
                    onClick={() => {
                      if (editingReadingText) {
                        setEditingReadingText(false);
                      } else {
                        setEditingReadingText(true);
                      }
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all"
                  >
                    {editingReadingText ? "✓ Yadda saxla" : "✏️ Redaktə et"}
                  </button>
                </div>

                {/* Reading Text Content */}
                {editingReadingText ? (
                  <textarea
                    value={generatedExam.readingText}
                    onChange={(e) => updateReadingText(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900 mb-4 resize-y"
                    placeholder="Mətni buraya yazın..."
                  />
                ) : (
                  <p className="text-gray-800 leading-7 text-base whitespace-pre-wrap mb-4">
                    {generatedExam.readingText}
                  </p>
                )}

                {/* Reading Comprehension Questions Info - using ReadingTextSection design */}
                {generatedExam.questions?.some((q: any) => q.readingTextId) && (
                  <div className="border-t border-gray-300 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                      <span className="text-blue-700 font-semibold text-base">
                        İpucu:
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      Bu mətn əsasında həll edilməli olan suallar:
                    </p>
                    <p className="text-sm text-blue-800">
                      {generatedExam.questions
                        ?.filter((q: any) => q.readingTextId)
                        .map((q: any) => {
                          const questionIndex =
                            generatedExam.questions.findIndex(
                              (q2: any) => q2 === q
                            );
                          return `Sual ${questionIndex + 1}`;
                        })
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {generatedExam.questions?.map((question: any, index: number) => {
                const isEditing = editingQuestionIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-6 bg-white"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-bold text-gray-900">
                        Sual {index + 1}
                      </h4>
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setEditingQuestionIndex(null);
                          } else {
                            setEditingQuestionIndex(index);
                          }
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all"
                      >
                        {isEditing ? "✓ Yadda saxla" : "✏️ Redaktə et"}
                      </button>
                    </div>

                    {/* Sual mətni */}
                    {isEditing ? (
                      <textarea
                        value={question.content}
                        onChange={(e) =>
                          updateQuestion(index, "content", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900 mb-4 resize-y min-h-[100px]"
                        rows={4}
                        placeholder="Sual mətnini daxil edin..."
                      />
                    ) : (
                      <p className="text-gray-800 mb-4 text-base leading-relaxed font-medium">
                        {question.content}
                      </p>
                    )}

                    {/* Variantlar - Multiple Choice */}
                    {question.options && question.options.length > 0 && (
                      <div className="space-y-3">
                        {question.options.map((opt: any, optIndex: number) => {
                          const isCorrect =
                            optIndex ===
                            parseInt(question.correctAnswer || "0");
                          return (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-lg ${
                                isCorrect
                                  ? "bg-green-50 border-2 border-green-500 text-gray-900"
                                  : "bg-gray-50 border border-gray-200 text-gray-900"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() =>
                                    setCorrectAnswer(index, optIndex)
                                  }
                                  className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    isCorrect
                                      ? "bg-green-500 border-green-600"
                                      : "bg-white border-gray-400 hover:border-green-500"
                                  }`}
                                  title="Düzgün cavabı seç"
                                >
                                  {isCorrect && (
                                    <span className="text-white text-xs font-bold">
                                      ✓
                                    </span>
                                  )}
                                </button>

                                <span className="font-semibold text-gray-900 flex-shrink-0">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>

                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={opt.content}
                                    onChange={(e) =>
                                      updateOption(
                                        index,
                                        optIndex,
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                                    placeholder="Variant mətnini daxil edin..."
                                  />
                                ) : (
                                  <span className="text-gray-900 flex-1">
                                    {opt.content}
                                  </span>
                                )}

                                {!isEditing && isCorrect && (
                                  <span className="ml-auto text-green-700 font-semibold flex-shrink-0">
                                    <span role="img" aria-label="Düzgün">
                                      ✓
                                    </span>{" "}
                                    Düzgün
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Model Answer - Open Ended Questions */}
                    {question.type === QuestionType.OPEN_ENDED && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nümunə Cavab
                        </label>
                        {isEditing ? (
                          <textarea
                            value={question.modelAnswer || ""}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "modelAnswer",
                                e.target.value
                              )
                            }
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900 resize-y"
                            placeholder="Nümunə cavabı buraya yazın..."
                          />
                        ) : (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {question.modelAnswer ||
                                "Nümunə cavab əlavə edilməyib"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                onClick={() => setStep("form")}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Geri
              </button>
              <button
                onClick={saveExam}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg"
              >
                {loading ? "Yadda saxlanılır..." : "İmtahanı Yadda Saxla"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            aria-label="İdarə panelinə qayıt"
            className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-4 font-semibold text-lg transition-colors duration-200 hover:gap-3"
          >
            <span className="text-xl" aria-hidden="true">
              ←
            </span>
            <span>İdarə panelinə qayıt</span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI ilə İmtahan Yaradın
          </h1>
          <p className="text-gray-600">3 klikdə imtahan hazırlayın</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  Mövzular *
                </label>
                <input
                  {...register("topic")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  placeholder="Məs: Tənliklər, funksiyalar"
                />
                {errors.topic && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.topic.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sual Sayı *
                </label>
                <input
                  {...register("questionCount", {
                    valueAsNumber: true,
                    setValueAs: (v) => {
                      if (v === "" || v === null || v === undefined) return 10;
                      const num = Number(v);
                      return isNaN(num) ? 10 : num;
                    },
                  })}
                  type="number"
                  min={1}
                  max={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                />
                {errors.questionCount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.questionCount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sual Növləri * (birdən çox seçə bilərsiniz)
                </label>
                <QuestionTypeMultiSelect
                  selectedTypes={selectedQuestionTypes}
                  onChange={(types) => setValue("questionTypes", types)}
                  placeholder="Sual növlərini seçin..."
                />
                {errors.questionTypes && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.questionTypes.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Müddət *
                </label>
                <select
                  {...register("duration", {
                    onChange: (e) => {
                      if (e.target.value && e.target.value !== "") {
                        clearErrors("duration");
                        trigger("duration");
                      }
                    },
                  })}
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

            {selectedQuestionTypes.includes(
              QuestionType.READING_COMPREHENSION
            ) && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mətn *
                  </label>
                  <textarea
                    {...register("readingText")}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                    placeholder="Buraya mətn daxil edin. AI bu mətndən suallar yaradacaq."
                  />
                  {errors.readingText && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.readingText.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mətndən neçə sual yaradılsın? *
                  </label>
                  <input
                    {...register("readingQuestionCount", {
                      valueAsNumber: true,
                      setValueAs: (v) => {
                        if (v === "" || v === null || v === undefined)
                          return undefined;
                        const num = Number(v);
                        return isNaN(num) ? undefined : num;
                      },
                    })}
                    type="number"
                    min={1}
                    max={50}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                    placeholder="Məs: 5"
                  />
                  {errors.readingQuestionCount && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.readingQuestionCount.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Mətndən neçə sual yaradılacağını göstərin
                  </p>
                </div>
              </>
            )}

            {selectedQuestionTypes.includes(QuestionType.OPEN_ENDED) && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <p className="text-sm text-blue-800 font-semibold mb-2">
                  💡 Açıq suallar üçün ipucu:
                </p>
                <p className="text-sm text-blue-700">
                  AI açıq suallar üçün model cavab yaradacaq. Sualınız nə qədər
                  konkret və spesifik olsa, model cavab da bir o qədər dəqiq
                  olacaq və şagirdlərin düzgün cavabları səhv qəbul edilmə
                  ehtimalı azalacaq. İmtahan yaradıldıqdan sonra model cavabları
                  redaktə edib daha spesifik edə bilərsiniz.
                </p>
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-gray-700">
                <strong>💡 İpucu:</strong> AI avtomatik olaraq sualları
                yaradacaq. Yaradılan imtahanı gözdən keçirib düzəltə bilərsiniz.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">{error}</p>
              </div>
            )}
            <div className="flex justify-end space-x-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Ləğv et
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>AI işləyir...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>AI ilə Yarat</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
