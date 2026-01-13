interface ExamStat {
  examId: string;
  examTitle: string;
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  createdAt: string;
  createdAtTime?: string;
}

interface ExamStatsTableProps {
  stats: ExamStat[];
  onViewDetail: (examId: string) => void;
  selectedExamId?: string | null;
}

export default function ExamStatsTable({
  stats,
  onViewDetail,
  selectedExamId,
}: ExamStatsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">
          İmtahan Statistikaları
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İmtahan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tarix
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cəhd Sayı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orta Bal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tamamlanma
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Əməliyyat
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.map((stat) => (
              <tr
                key={stat.examId}
                className={`hover:bg-gray-50 ${
                  selectedExamId === stat.examId ? "bg-indigo-50" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {stat.examTitle}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {stat.createdAt || "-"}
                  </div>
                  {stat.createdAtTime && (
                    <div className="text-xs text-gray-500">
                      {stat.createdAtTime}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {stat.totalAttempts}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {stat.averageScore > 0
                      ? `${stat.averageScore.toFixed(1)}%`
                      : "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {stat.completionRate > 0
                      ? `${(stat.completionRate * 100).toFixed(1)}%`
                      : "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onViewDetail(stat.examId)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Detallı gör
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
