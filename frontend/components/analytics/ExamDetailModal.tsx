interface Attempt {
  id: string;
  student: {
    firstName: string;
    lastName: string;
    email: string;
  };
  score: number | null;
  totalScore: number | null;
  status: string;
  percentage: string | null;
  position: number;
  prizeAmount: number;
}

interface ExamDetail {
  examTitle: string;
  totalAttempts: number;
  averageScore: number;
  attempts: Attempt[];
}

interface ExamDetailModalProps {
  examDetail: ExamDetail;
  loading: boolean;
  onClose: () => void;
  onSelectAttempt: (attempt: Attempt) => void;
}

export default function ExamDetailModal({
  examDetail,
  loading,
  onClose,
  onSelectAttempt,
}: ExamDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {examDetail.examTitle}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {examDetail.totalAttempts} cəhd • Orta bal:{" "}
              {examDetail.averageScore.toFixed(1)}%
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {examDetail.attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
                  onClick={() => onSelectAttempt(attempt)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {attempt.student.firstName} {attempt.student.lastName}
                        </h3>
                        {attempt.position > 0 && attempt.position <= 3 && (
                          <span className="text-2xl">
                            <span
                              role="img"
                              aria-label={`${
                                attempt.position === 1
                                  ? "Birinci"
                                  : attempt.position === 2
                                  ? "İkinci"
                                  : "Üçüncü"
                              } yer medalı`}
                            >
                              {attempt.position === 1
                                ? "🥇"
                                : attempt.position === 2
                                ? "🥈"
                                : "🥉"}
                            </span>
                          </span>
                        )}
                        {attempt.position > 0 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            #{attempt.position}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {attempt.student.email}
                      </p>
                      {attempt.prizeAmount > 0 && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-sm font-semibold text-green-600">
                            +{attempt.prizeAmount.toFixed(2)} AZN mükafat
                          </span>
                          <span className="text-xs" role="img" aria-label="Pul">
                            💰
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {attempt.score !== null && attempt.totalScore !== null
                          ? `${attempt.score}/${attempt.totalScore}`
                          : "-"}
                      </div>
                      {attempt.percentage && (
                        <div className="text-sm text-gray-600">
                          {attempt.percentage}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {examDetail.attempts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Hələ heç bir cəhd yoxdur
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
