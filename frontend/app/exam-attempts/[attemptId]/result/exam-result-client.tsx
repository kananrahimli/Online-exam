"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import { QuestionType } from "@/lib/types";
import ResultSummary from "@/components/exam-result/ResultSummary";
import LeaderboardSection from "@/components/exam-result/LeaderboardSection";
import QuestionResultItem from "@/components/exam-result/QuestionResultItem";
import ReadingTextSection from "@/components/exam/ReadingTextSection";
import { API_ENDPOINTS, ROUTES } from "@/lib/constants/routes";

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
        const userResponse = await api.get(API_ENDPOINTS.AUTH.ME);
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
      const response = await api.get(API_ENDPOINTS.EXAMS.LEADERBOARD(examId));
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

  // Group questions by readingTextId
  const getGroupedQuestions = () => {
    const allQuestions = getAllQuestions();
    if (!result || !result.exam || !result.exam.readingTexts) {
      return { grouped: [], ungrouped: allQuestions };
    }

    // Create a map of readingTextId -> readingText
    const readingTextsMap = new Map(
      result.exam.readingTexts.map((rt: any) => [rt.id, rt])
    );

    // Group questions by readingTextId
    const groupedMap = new Map<string, any[]>();
    const ungrouped: any[] = [];

    allQuestions.forEach((q: any) => {
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
            href={ROUTES.EXAMS}
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
            href={ROUTES.DASHBOARD}
            aria-label="İdarə panelinə qayıt"
            className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-4 font-semibold text-lg transition-colors duration-200 hover:gap-3"
          >
            <span className="text-xl" aria-hidden="true">
              ←
            </span>
            <span>İdarə panelinə qayıt</span>
          </Link>
        </div>

        <ResultSummary
          examTitle={result.exam.title}
          percentage={percentage}
          score={result.score}
          totalScore={result.totalScore}
          correctCount={correctCount}
          totalCount={totalCount}
        />

        <LeaderboardSection
          leaderboard={leaderboard || []}
          currentUserId={initialUser?.id}
          loading={loadingLeaderboard}
        />

        {/* Detailed Results */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Suallar və Cavablar
          </h2>

          <div className="space-y-8">
            {(() => {
              const { grouped, ungrouped } = getGroupedQuestions();
              const allQuestions = getAllQuestions();
              const result: JSX.Element[] = [];
              const shownReadingTexts = new Set<string>();

              // Create a map of readingTextId -> group for quick lookup
              // Use the readingTextId from the first question in each group as the key
              const readingTextGroupsMap = new Map<string, any>();
              grouped.forEach((group: any) => {
                if (group.readingText?.id && group.questions.length > 0) {
                  // Use the readingTextId from the first question as the key
                  const readingTextId = group.questions[0]?.readingTextId;
                  if (readingTextId) {
                    readingTextGroupsMap.set(readingTextId, group);
                  }
                }
              });

              // Combine all questions and sort by order
              const allQuestionsSorted = [
                ...ungrouped,
                ...grouped.flatMap((group) => group.questions),
              ].sort((a, b) => a.order - b.order);

              // Render questions in order, showing reading text before first question of each group
              allQuestionsSorted.forEach((question: any) => {
                const index = allQuestions.findIndex(
                  (q: any) => q.id === question.id
                );

                // Check if this question belongs to a reading text
                if (question.readingTextId) {
                  const group = readingTextGroupsMap.get(
                    question.readingTextId
                  );

                  // Show reading text before first question of this group
                  if (
                    group?.readingText &&
                    !shownReadingTexts.has(question.readingTextId)
                  ) {
                    const questionNumbers = group.questions.map((q: any) => {
                      const idx = allQuestions.findIndex(
                        (aq: any) => aq.id === q.id
                      );
                      return idx + 1;
                    });

                    result.push(
                      <ReadingTextSection
                        key={`text-${question.readingTextId}`}
                        readingText={group.readingText}
                        questionNumbers={questionNumbers}
                      />
                    );
                    shownReadingTexts.add(question.readingTextId);
                  }
                }

                const answer = getAnswerForQuestion(question.id);
                const isCorrect = answer?.isCorrect || false;

                result.push(
                  <QuestionResultItem
                    key={question.id}
                    question={question}
                    index={index}
                    answer={answer}
                    isCorrect={isCorrect}
                  />
                );
              });

              return <>{result}</>;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
