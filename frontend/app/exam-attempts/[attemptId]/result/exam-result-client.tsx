"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import { QuestionType } from "@/lib/types";

interface ExamResultClientProps {
  initialResult: any;
  initialLeaderboard: any;
  initialBalance: number;
  initialUser: any;
  attemptId: string;
}

export default function ExamResultClient({
  initialResult,
  initialLeaderboard,
  initialBalance,
  initialUser,
  attemptId,
}: ExamResultClientProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [result] = useState<any>(initialResult);
  const [leaderboard, setLeaderboard] = useState<any>(initialLeaderboard);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

  // Refresh user data to get updated balance (prizes may have been awarded)
  useEffect(() => {
    const refreshUser = async () => {
      try {
        const userResponse = await api.get("/auth/me");
        setUser(userResponse.data);
      } catch (err) {
        console.error("Error refreshing user data:", err);
      }
    };
    refreshUser();
  }, [setUser]);

  const fetchLeaderboard = async (examId: string) => {
    try {
      setLoadingLeaderboard(true);
      const response = await api.get(`/exams/${examId}/leaderboard`);
      setLeaderboard(response.data);
    } catch (err: any) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const getAllQuestions = () => {
    if (!result || !result.exam) return [];
    // Backend already provides allQuestions with readingText mapped
    return (result.exam as any).allQuestions || [];
  };

  const getAnswerForQuestion = (questionId: string) => {
    if (!result || !result.answers) return null;
    return result.answers.find((ans: any) => ans.questionId === questionId);
  };

  const getCorrectAnswerOption = (question: any) => {
    if (question.type === QuestionType.MULTIPLE_CHOICE && question.options) {
      // Find the option that matches correctAnswer (could be ID or index)
      if (question.correctAnswer && question.correctAnswer.length > 15) {
        // It's an option ID
        return question.options.find(
          (opt: any) => opt.id === question.correctAnswer
        );
      } else {
        // It might be an index
        const index = parseInt(question.correctAnswer, 10);
        if (!isNaN(index) && question.options[index]) {
          return question.options[index];
        }
      }
    }
    return null;
  };

  const getCorrectAnswer = (question: any) => {
    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      const correctOption = getCorrectAnswerOption(question);
      return correctOption ? correctOption.content : question.correctAnswer;
    }
    return question.modelAnswer;
  };

  const calculatePercentage = () => {
    if (!result || !result.totalScore || result.totalScore === 0) return 0;
    return Math.round((result.score / result.totalScore) * 100);
  };

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Xəta baş verdi
          </h2>
          <p className="text-gray-600 mb-6">Nəticə tapılmadı</p>
          <Link
            href="/exams"
            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            İmtahanlar səhifəsinə qayıt
          </Link>
        </div>
      </div>
    );
  }

  const questions = getAllQuestions();
  const percentage = calculatePercentage();
  const correctCount =
    result.answers?.filter((ans: any) => ans.isCorrect).length || 0;
  const totalCount = questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/exams"
            aria-label="İdarə panelinə qayıt"
            className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-4 font-semibold text-lg transition-colors duration-200 hover:gap-3"
          >
            <span className="text-xl" aria-hidden="true">
              ←
            </span>
            <span>İdarə panelinə qayıt</span>
          </Link>
        </div>

        {/* Result Summary */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {result.exam.title}
            </h1>
            <p className="text-gray-600">İmtahan nəticəsi</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                {percentage}%
              </div>
              <div className="text-sm text-gray-600">Ümumi bal</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {result.score} / {result.totalScore}
              </div>
              <div className="text-sm text-gray-600">Toplanan bal</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {correctCount} / {totalCount}
              </div>
              <div className="text-sm text-gray-600">Doğru cavab</div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/exams"
              aria-label="Digər imtahanları görüntülə"
              className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Digər imtahanlara bax
            </Link>
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Reytinq (Leaderboard)
            </h2>
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((entry: any, index: number) => {
                const isCurrentUser =
                  entry.student?.id === initialUser?.id ||
                  entry.studentId === initialUser?.id;
                return (
                  <div
                    key={entry.id || index}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isCurrentUser
                        ? "bg-indigo-50 border-indigo-300"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-lg font-bold ${
                          index === 0
                            ? "text-yellow-600"
                            : index === 1
                            ? "text-gray-400"
                            : index === 2
                            ? "text-orange-600"
                            : "text-gray-600"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <div>
                        <p
                          className={`font-semibold ${
                            isCurrentUser ? "text-indigo-900" : "text-gray-900"
                          }`}
                        >
                          {entry.student?.firstName || entry.firstName}{" "}
                          {entry.student?.lastName || entry.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {entry.percentage?.toFixed(2) || "0"}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          isCurrentUser ? "text-indigo-900" : "text-gray-900"
                        }`}
                      >
                        {entry.score || 0} / {entry.totalScore || 0}
                      </p>
                      {entry.prizeAmount > 0 && (
                        <p className="text-sm text-green-600 font-semibold">
                          +{entry.prizeAmount.toFixed(2)} AZN{" "}
                          <span role="img" aria-label="Mükafat kuboku">
                            🏆
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Results */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Suallar və Cavablar
          </h2>

          <div className="space-y-8">
            {questions.map((question: any, index: number) => {
              const answer = getAnswerForQuestion(question.id);
              const correctAnswer = getCorrectAnswer(question);
              const isCorrect = answer?.isCorrect || false;

              return (
                <div key={question.id} className="space-y-4">
                  <div
                    className={`border-2 rounded-xl p-6 ${
                      isCorrect
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                            Sual {index + 1}
                          </span>
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                            {question.type === QuestionType.MULTIPLE_CHOICE
                              ? "Test"
                              : question.type === QuestionType.OPEN_ENDED
                              ? "Açıq sual"
                              : "Mətn əsaslı"}
                          </span>
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                            {question.points || 1} bal
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              isCorrect
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <span role="img" aria-label="Düzgün">
                                  ✓
                                </span>{" "}
                                Doğru
                              </>
                            ) : (
                              <>
                                <span role="img" aria-label="Səhv">
                                  ✗
                                </span>{" "}
                                Səhv
                              </>
                            )}
                          </span>
                          {answer && (
                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                              {answer.points || 0} bal qazanıldı
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {question.content}
                        </p>
                      </div>
                    </div>
                  </div>

                  {question.type === QuestionType.MULTIPLE_CHOICE &&
                    question.options && (
                      <div className="space-y-3 mt-4">
                        {question.options
                          .sort((a: any, b: any) => a.order - b.order)
                          .map((option: any, optIndex: number) => {
                            const isSelected = answer?.optionId === option.id;
                            // Check if this option is the correct answer
                            // correctAnswer could be an option ID (long string) or an index (short string)
                            let isCorrectOption = false;
                            if (question.correctAnswer) {
                              if (question.correctAnswer.length > 15) {
                                // It's an option ID
                                isCorrectOption =
                                  question.correctAnswer === option.id;
                              } else {
                                // It might be an index, check if this option's order matches
                                const correctIndex = parseInt(
                                  question.correctAnswer,
                                  10
                                );
                                if (
                                  !isNaN(correctIndex) &&
                                  option.order === correctIndex
                                ) {
                                  isCorrectOption = true;
                                }
                                // Also check direct ID match in case it's stored as ID
                                if (question.correctAnswer === option.id) {
                                  isCorrectOption = true;
                                }
                              }
                            }

                            return (
                              <div
                                key={option.id}
                                className={`flex items-center p-4 border-2 rounded-lg ${
                                  isCorrectOption
                                    ? "border-green-500 bg-green-100"
                                    : isSelected && !isCorrectOption
                                    ? "border-red-500 bg-red-100"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
                                <span
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                    isCorrectOption
                                      ? "bg-green-500 text-white"
                                      : isSelected && !isCorrectOption
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-200 text-gray-600"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span className="ml-4 text-gray-900 flex-1">
                                  {option.content}
                                </span>
                                {isCorrectOption && (
                                  <span className="text-green-700 font-semibold">
                                    <span role="img" aria-label="Düzgün">
                                      ✓
                                    </span>{" "}
                                    Düzgün cavab
                                  </span>
                                )}
                                {isSelected && !isCorrectOption && (
                                  <span className="text-red-700 font-semibold">
                                    <span role="img" aria-label="Səhv">
                                      ✗
                                    </span>{" "}
                                    Sizin seçiminiz
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}

                  {question.type === QuestionType.OPEN_ENDED && (
                    <div className="space-y-4 mt-4">
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Sizin cavabınız:
                        </p>
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {answer?.content || "Cavab verilməyib"}
                        </p>
                      </div>
                      {question.modelAnswer && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                          <p className="text-sm text-green-700 mb-2 font-semibold">
                            Nümunə cavab:
                          </p>
                          <p className="text-green-900 whitespace-pre-wrap">
                            {question.modelAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
