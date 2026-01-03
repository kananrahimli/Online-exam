import { formatTimeDuration } from "@/lib/utils";

interface TimerSectionProps {
  examTitle: string;
  answeredCount: number;
  totalQuestions: number;
  timeRemaining: number;
  tabChangeCount: number;
  submitting: boolean;
  onSubmit: () => void;
}

export default function TimerSection({
  examTitle,
  answeredCount,
  totalQuestions,
  timeRemaining,
  tabChangeCount,
  submitting,
  onSubmit,
}: TimerSectionProps) {
  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{examTitle}</h1>
            <p className="text-sm text-gray-600">
              {answeredCount} / {totalQuestions} sual cavablandırılıb
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
              ⏱️ {formatTimeDuration(timeRemaining)}
            </div>

            {tabChangeCount > 0 && (
              <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold">
                ⚠️ Tab dəyişikliyi: {tabChangeCount}
              </div>
            )}

            <button
              onClick={onSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Təqdim olunur..." : "İmtahanı bitir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
