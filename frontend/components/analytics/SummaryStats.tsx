interface SummaryStatsProps {
  totalExams: number;
  totalAttempts: number;
  averageScore: number;
  totalStudents: number;
}

export default function SummaryStats({
  totalExams,
  totalAttempts,
  averageScore,
  totalStudents,
}: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Ümumi İmtahan</p>
            <p className="text-3xl font-bold text-gray-900">{totalExams}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl" role="img" aria-label="Statistika">
              📊
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Ümumi Cəhd</p>
            <p className="text-3xl font-bold text-gray-900">{totalAttempts}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl" role="img" aria-label="İmtahan">
              📝
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Orta Bal</p>
            <p className="text-3xl font-bold text-gray-900">
              {averageScore > 0 ? averageScore.toFixed(1) : "0"}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl" role="img" aria-label="Ulduz">
              ⭐
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Şagird Sayı</p>
            <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl" role="img" aria-label="İstifadəçilər">
              👥
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

