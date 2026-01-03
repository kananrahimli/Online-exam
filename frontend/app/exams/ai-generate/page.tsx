"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { QuestionType } from "@/lib/types";
import QuestionTypeMultiSelect from "@/components/QuestionTypeMultiSelect";

const aiGenerateSchema = z
  .object({
    subject: z.string().min(2, "Fənn adı lazımdır"),
    level: z.string().min(1, "Sinif lazımdır"),
    topic: z.string().min(2, "Mövzu lazımdır"),
    questionCount: z.number().min(1).max(100),
    questionTypes: z
      .array(z.nativeEnum(QuestionType))
      .min(1, "Ən azı bir sual tipi seçilməlidir"),
    readingText: z.string().optional(),
    readingQuestionCount: z.number().optional(),
    title: z.string().min(3, "Başlıq lazımdır"),
    duration: z
      .enum(["60", "120", "180"], {
        errorMap: () => ({ message: "Müddət seçilməlidir" }),
      })
      .transform((val) => parseInt(val)),
  })
  .refine(
    (data) => {
      // Əgər READING_COMPREHENSION seçilibsə, readingText və readingQuestionCount lazımdır
      if (data.questionTypes?.includes(QuestionType.READING_COMPREHENSION)) {
        return (
          data.readingText &&
          data.readingText.length > 0 &&
          data.readingQuestionCount &&
          data.readingQuestionCount > 0
        );
      }
      return true;
    },
    {
      message: "Mətn əsaslı suallar üçün mətn və sual sayı lazımdır",
      path: ["readingText"],
    }
  );

type AIGenerateFormData = z.infer<typeof aiGenerateSchema>;

export default function AIGenerateExamPage() {
  const router = useRouter();
  const { token, initialize } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedExam, setGeneratedExam] = useState<any>(null);
  const [step, setStep] = useState<"form" | "review">("form");

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
      duration: 60,
    },
  });

  const selectedQuestionTypes = watch("questionTypes") || [];
  const readingText = watch("readingText");

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

      setGeneratedExam({
        ...response.data,
        title: data.title,
        description: `${data.subject} - Sinif ${data.level} səviyyəsi, ${data.topic} mövzusu`,
        duration: data.duration,
      });

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

  const saveExam = async () => {
    if (!generatedExam) return;

    setLoading(true);
    try {
      const examData = {
        title: generatedExam.title,
        description: generatedExam.description,
        subject: generatedExam.subject || watch("subject"),
        level: generatedExam.level || watch("level"),
        duration: generatedExam.duration,
        questions: generatedExam.questions?.map((q: any, index: number) => ({
          type: q.type,
          content: q.content,
          points: q.points || 1,
          options: q.options?.map((opt: any, optIndex: number) => ({
            content: opt.content,
            order: optIndex,
          })),
          correctAnswer: q.correctAnswer,
          order: index,
        })),
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

            <div className="space-y-4">
              {generatedExam.questions?.map((question: any, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">Sual {index + 1}</h4>
                    <button
                      onClick={() => {
                        // Regenerate question logic would go here
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Yenidən yarat
                    </button>
                  </div>
                  <p className="text-gray-700 mb-3">{question.content}</p>
                  {question.options && (
                    <div className="space-y-2">
                      {question.options.map((opt: any, optIndex: number) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded ${
                            optIndex === parseInt(question.correctAnswer || "0")
                              ? "bg-green-100 border-2 border-green-500"
                              : "bg-gray-50"
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {opt.content}
                          {optIndex ===
                            parseInt(question.correctAnswer || "0") && (
                            <span className="ml-2 text-green-600 font-semibold">
                              <span role="img" aria-label="Düzgün">
                                ✓
                              </span>{" "}
                              Düzgün
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
                  {...register("questionCount", { valueAsNumber: true })}
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
