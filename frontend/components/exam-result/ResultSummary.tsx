import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

interface ResultSummaryProps {
  examTitle: string;
  percentage: number;
  score: number;
  totalScore: number;
  correctCount: number;
  totalCount: number;
}

export default function ResultSummary({
  examTitle,
  percentage,
  score,
  totalScore,
  correctCount,
  totalCount,
}: ResultSummaryProps) {
  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{examTitle}</h1>
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
            {score} / {totalScore}
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
          href={ROUTES.EXAMS}
          aria-label="Digər imtahanları görüntülə"
          className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          Digər imtahanlara bax
        </Link>
      </div>
    </div>
  );
}

