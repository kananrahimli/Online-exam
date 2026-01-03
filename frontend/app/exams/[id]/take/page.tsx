"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { Exam, Question, QuestionType } from "@/lib/types";
import { useAlert } from "@/hooks/useAlert";

// Question Component
function QuestionComponent({
  question,
  globalIndex,
  answers,
  handleAnswerChange,
  topicPoints,
}: {
  question: Question;
  globalIndex: number;
  answers: Record<string, string>;
  handleAnswerChange: (questionId: string, value: string) => void;
  topicPoints?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                Sual {globalIndex + 1}
              </span>
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {question.type === QuestionType.MULTIPLE_CHOICE
                  ? "Test"
                  : question.type === QuestionType.OPEN_ENDED
                  ? "Açıq sual"
                  : "Mətn əsaslı"}
              </span>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                {question.points || topicPoints || 1} bal
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {question.content}
            </p>
          </div>
          {answers[question.id] && (
            <span className="text-green-600 text-sm font-medium ml-4">
              <span role="img" aria-label="Cavablandırılıb">
                ✓
              </span>{" "}
              Cavablandırılıb
            </span>
          )}
        </div>

        {question.type === QuestionType.MULTIPLE_CHOICE && question.options && (
          <div className="space-y-3 mt-4">
            {question.options
              .sort((a, b) => a.order - b.order)
              .map((option, optIndex) => (
                <label
                  key={option.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers[question.id] === option.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={answers[question.id] === option.id}
                    onChange={(e) =>
                      handleAnswerChange(question.id, e.target.value)
                    }
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-4 text-gray-900 flex-1">
                    {String.fromCharCode(65 + optIndex)}. {option.content}
                  </span>
                </label>
              ))}
          </div>
        )}

        {question.type === QuestionType.OPEN_ENDED && (
          <div className="mt-4">
            <textarea
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
              placeholder="Cavabınızı yazın..."
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TakeExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const { user, token, initialize } = useAuthStore();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> answer (optionId or content)
  const [submitting, setSubmitting] = useState(false);
  const [tabChangeCount, setTabChangeCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const expiresAtRef = useRef<Date | null>(null);

  useEffect(() => {
    initialize();
    if (!token || !attemptId) {
      router.push("/exams");
      return;
    }

    fetchAttempt();
    setupTabChangeDetection();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Cleanup tab change detection
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attemptId]);

  const fetchAttempt = async () => {
    try {
      const response = await api.get(`/exam-attempts/${attemptId}`);
      const attempt = response.data;

      if (!attempt || !attempt.exam) {
        throw new Error("İmtahan tapılmadı");
      }

      // Check if exam is already completed
      if (attempt.status === "COMPLETED") {
        router.push(`/exam-attempts/${attemptId}/result`);
        return;
      }

      setExam(attempt.exam);

      // Initialize answers from existing answers
      const initialAnswers: Record<string, string> = {};
      if (attempt.answers) {
        attempt.answers.forEach((ans: any) => {
          if (ans.optionId) {
            initialAnswers[ans.questionId] = ans.optionId;
          } else if (ans.content) {
            initialAnswers[ans.questionId] = ans.content;
          }
        });
      }
      setAnswers(initialAnswers);

      // Set expiry time and start timer
      if (attempt.expiresAt) {
        expiresAtRef.current = new Date(attempt.expiresAt);
        updateTimeRemaining();
        startTimer();
      } else {
        // If no expiresAt, calculate from exam duration
        const durationMinutes = attempt.exam.duration || 60;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);
        expiresAtRef.current = expiresAt;
        updateTimeRemaining();
        startTimer();
      }
    } catch (err: any) {
      console.error("Error fetching attempt:", err);
      showAlert({
        message:
          err.response?.data?.message || "İmtahan yüklənərkən xəta baş verdi",
        type: "error",
        confirmButtonText: "Tamam",
      });
      setTimeout(() => {
        router.push("/exams");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    if (!expiresAtRef.current) return;

    const now = new Date();
    const diff = Math.floor(
      (expiresAtRef.current.getTime() - now.getTime()) / 1000
    );

    if (diff <= 0) {
      setTimeRemaining(0);
      handleTimeExpired();
      return;
    }

    setTimeRemaining(diff);
  };

  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      updateTimeRemaining();
    }, 1000);
  };

  const handleTimeExpired = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    showAlert({
      message:
        "İmtahan müddəti bitdi! Cavablar avtomatik olaraq yadda saxlanılacaq.",
      type: "warning",
      confirmButtonText: "Tamam",
    });
    setTimeout(async () => {
      await handleSubmit(true); // Skip confirm for time expiration
    }, 1500);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setTabChangeCount((prev) => {
        const newCount = prev + 1;
        // Tab dəyişib - xəbərdarlıq göstər
        if (newCount >= 3) {
          showAlert({
            message:
              "XƏBƏRDARLIQ: Tab dəyişdirmək qadağandır! 3 dəfədən çox tab dəyişdirsəniz, imtahan avtomatik olaraq bitiriləcək.",
            type: "warning",
            confirmButtonText: "Başa düşdüm",
          });
        }
        return newCount;
      });
    }
  };

  const handleBlur = () => {
    setTabChangeCount((prev) => prev + 1);
  };

  const setupTabChangeDetection = () => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
  };

  const handleAnswerChange = async (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    // Auto-save answer
    try {
      const question = getAllQuestions().find((q) => q.id === questionId);
      if (!question) return;

      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        await api.put(`/exam-attempts/${attemptId}/answers`, {
          questionId,
          optionId: value,
        });
      } else {
        await api.put(`/exam-attempts/${attemptId}/answers`, {
          questionId,
          content: value,
        });
      }
    } catch (err) {
      console.error("Error saving answer:", err);
    }
  };

  const getAllQuestions = (): Question[] => {
    if (!exam) return [];
    // Backend already provides allQuestions with readingText mapped
    return (exam as any).allQuestions || [];
  };

  // Group questions by readingTextId
  const getGroupedQuestions = () => {
    const allQuestions = getAllQuestions();
    if (!exam || !exam.readingTexts) {
      return { grouped: [], ungrouped: allQuestions };
    }

    // Create a map of readingTextId -> readingText
    const readingTextsMap = new Map(
      exam.readingTexts.map((rt: any) => [rt.id, rt])
    );

    // Group questions by readingTextId
    const groupedMap = new Map<string, Question[]>();
    const ungrouped: Question[] = [];

    allQuestions.forEach((q) => {
      if (q.readingTextId) {
        if (!groupedMap.has(q.readingTextId)) {
          groupedMap.set(q.readingTextId, []);
        }
        groupedMap.get(q.readingTextId)!.push(q);
      } else {
        ungrouped.push(q);
      }
    });

    // Convert map to array with readingText info
    const grouped = Array.from(groupedMap.entries()).map(
      ([readingTextId, questions]) => ({
        readingText: readingTextsMap.get(readingTextId),
        questions: questions.sort((a, b) => a.order - b.order),
      })
    );

    return { grouped, ungrouped };
  };

  const handleSubmit = async (skipConfirm: boolean = false) => {
    if (!skipConfirm) {
      const confirmed = await showConfirm({
        message:
          "İmtahanı bitirmək istədiyinizə əminsiniz? Dəyişiklik edə bilməyəcəksiniz.",
        type: "warning",
        confirmButtonText: "Bəli, bitir",
        cancelButtonText: "Ləğv et",
        onConfirm: async () => {
          await submitExam();
        },
      });
      if (!confirmed) return;
    } else {
      await submitExam();
    }
  };

  const submitExam = async () => {
    setSubmitting(true);
    try {
      await api.post(`/exam-attempts/${attemptId}/submit`);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      router.push(`/exam-attempts/${attemptId}/result`);
    } catch (err: any) {
      console.error("Error submitting exam:", err);
      showAlert({
        message:
          err.response?.data?.message ||
          "İmtahan təqdim olunarkən xəta baş verdi",
        type: "error",
        confirmButtonText: "Tamam",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">İmtahan yüklənir...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            İmtahan tapılmadı
          </h2>
          <button
            onClick={() => router.push("/exams")}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            İmtahanlar səhifəsinə qayıt
          </button>
        </div>
      </div>
    );
  }

  const questions = getAllQuestions();
  const answeredCount = Object.keys(answers).filter(
    (id) => answers[id] && answers[id].trim() !== ""
  ).length;

  return (
    <>
      <AlertComponent />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Fixed Header with Timer */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {exam.title}
                </h1>
                <p className="text-sm text-gray-600">
                  {answeredCount} / {questions.length} sual cavablandırılıb
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`px-6 py-3 rounded-lg font-bold text-lg ${
                    timeRemaining < 300
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : timeRemaining < 600
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  ⏱️ {formatTime(timeRemaining)}
                </div>

                {tabChangeCount > 0 && (
                  <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold">
                    ⚠️ Tab dəyişikliyi: {tabChangeCount}
                  </div>
                )}

                <button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "Təqdim olunur..." : "İmtahanı bitir"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Group questions by topics */}
            {exam.topics && exam.topics.length > 0
              ? exam.topics.map((topic: any, topicIndex: number) => {
                  const topicQuestions = topic.questions || [];
                  if (topicQuestions.length === 0) return null;

                  // Group questions by readingTextId within this topic
                  const readingTextsMap = new Map(
                    exam.readingTexts?.map((rt: any) => [rt.id, rt]) || []
                  );
                  const groupedByText = new Map<string, Question[]>();
                  const ungroupedQuestions: Question[] = [];

                  topicQuestions.forEach((q: Question) => {
                    if (q.readingTextId) {
                      if (!groupedByText.has(q.readingTextId)) {
                        groupedByText.set(q.readingTextId, []);
                      }
                      groupedByText.get(q.readingTextId)!.push(q);
                    } else {
                      ungroupedQuestions.push(q);
                    }
                  });

                  const shownReadingTexts = new Set<string>();

                  return (
                    <div key={topic.id || topicIndex} className="space-y-4">
                      {/* Topic Header */}
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                        <h2 className="text-2xl font-bold mb-2">
                          {topic.name}
                        </h2>
                        {topic.points && (
                          <p className="text-sm opacity-90">
                            Hər sual üçün: {topic.points} bal
                          </p>
                        )}
                      </div>

                      {/* Questions in this topic - grouped by reading text */}
                      {(() => {
                        const allQuestions = getAllQuestions();
                        const result: JSX.Element[] = [];

                        // First, show questions grouped by reading text
                        groupedByText.forEach((questions, readingTextId) => {
                          const readingText =
                            readingTextsMap.get(readingTextId);
                          const sortedQuestions = questions.sort(
                            (a, b) => a.order - b.order
                          );

                          sortedQuestions.forEach((question, qIndex) => {
                            const globalIndex = allQuestions.findIndex(
                              (q) => q.id === question.id
                            );

                            // Show reading text before first question
                            if (qIndex === 0 && readingText) {
                              const questionNumbers = sortedQuestions.map(
                                (q) => {
                                  const idx = allQuestions.findIndex(
                                    (aq) => aq.id === q.id
                                  );
                                  return idx + 1;
                                }
                              );

                              result.push(
                                <div
                                  key={`text-${readingTextId}`}
                                  className="bg-blue-50 rounded-lg border border-blue-200 p-6 shadow-sm"
                                >
                                  {/* Hint Header */}
                                  <div className="flex items-center gap-2 mb-4">
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

                                  {/* Text Content */}
                                  <div className="bg-white rounded-lg p-4 mb-4 border border-blue-100">
                                    <p className="text-gray-800 leading-7 text-base whitespace-pre-wrap">
                                      {readingText.content}
                                    </p>
                                  </div>

                                  {/* Questions Info */}
                                  <div className="bg-blue-100 rounded-lg p-3 border border-blue-200">
                                    <p className="text-sm font-semibold text-blue-900 mb-2">
                                      Bu mətn əsasında həll edilməli olan
                                      suallar:
                                    </p>
                                    <p className="text-sm text-blue-800">
                                      {questionNumbers
                                        .map((num) => `Sual ${num}`)
                                        .join(", ")}
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            result.push(
                              <QuestionComponent
                                key={question.id}
                                question={question}
                                globalIndex={globalIndex}
                                answers={answers}
                                handleAnswerChange={handleAnswerChange}
                                topicPoints={topic.points}
                              />
                            );
                          });
                        });

                        // Show ungrouped questions
                        ungroupedQuestions.forEach((question) => {
                          const globalIndex = allQuestions.findIndex(
                            (q) => q.id === question.id
                          );

                          result.push(
                            <QuestionComponent
                              key={question.id}
                              question={question}
                              globalIndex={globalIndex}
                              answers={answers}
                              handleAnswerChange={handleAnswerChange}
                              topicPoints={topic.points}
                            />
                          );
                        });

                        return <>{result}</>;
                      })()}
                    </div>
                  );
                })
              : (() => {
                  // No topics - show questions grouped by reading text
                  const { grouped, ungrouped } = getGroupedQuestions();
                  const allQuestions = getAllQuestions();

                  return (
                    <>
                      {/* Questions grouped by reading text */}
                      {grouped.map((group) => {
                        const questionNumbers = group.questions.map((q) => {
                          const idx = allQuestions.findIndex(
                            (aq) => aq.id === q.id
                          );
                          return idx + 1;
                        });

                        return (
                          <div
                            key={group.readingText?.id}
                            className="space-y-4"
                          >
                            {/* Reading Text */}
                            {group.readingText && (
                              <div className="bg-blue-100 rounded-lg border border-blue-200 p-6 shadow-sm">
                                {/* Text Content */}
                                <p className="text-blue-900 leading-7 text-base whitespace-pre-wrap">
                                  {group.readingText.content}
                                </p>

                                {/* Questions Info */}
                                <div className="mt-4">
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
                                    {questionNumbers
                                      .map((num) => `Sual ${num}`)
                                      .join(", ")}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Questions for this reading text */}
                            {group.questions.map((question) => {
                              const globalIndex = allQuestions.findIndex(
                                (q) => q.id === question.id
                              );
                              return (
                                <QuestionComponent
                                  key={question.id}
                                  question={question}
                                  globalIndex={globalIndex}
                                  answers={answers}
                                  handleAnswerChange={handleAnswerChange}
                                />
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Questions without reading text */}
                      {ungrouped.map((question) => {
                        const globalIndex = allQuestions.findIndex(
                          (q) => q.id === question.id
                        );
                        return (
                          <QuestionComponent
                            key={question.id}
                            question={question}
                            globalIndex={globalIndex}
                            answers={answers}
                            handleAnswerChange={handleAnswerChange}
                          />
                        );
                      })}
                    </>
                  );
                })()}
          </div>

          {/* Submit Button at Bottom */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-lg"
            >
              {submitting
                ? "Təqdim olunur..."
                : "İmtahanı bitir və nəticəni gör"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
