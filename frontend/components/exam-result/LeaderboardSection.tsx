interface LeaderboardEntry {
  id: string;
  studentId?: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  firstName?: string;
  lastName?: string;
  score: number;
  totalScore: number;
  percentage?: number;
  prizeAmount: number;
}

interface LeaderboardSectionProps {
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  loading?: boolean;
}

export default function LeaderboardSection({
  leaderboard,
  currentUserId,
  loading = false,
}: LeaderboardSectionProps) {
  // Ensure leaderboard is an array
  const leaderboardArray = Array.isArray(leaderboard) ? leaderboard : [];

  if (leaderboardArray.length === 0) return null;

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Reytinq (Leaderboard)
      </h2>
      <div className="space-y-2">
        {leaderboardArray.slice(0, 10).map((entry, index) => {
          const isCurrentUser =
            entry.student?.id === currentUserId ||
            entry.studentId === currentUserId;
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
  );
}

