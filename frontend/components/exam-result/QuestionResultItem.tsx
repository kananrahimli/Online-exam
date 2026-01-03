import { QuestionType } from "@/lib/types";

interface Option {
  id: string;
  content: string;
  order: number;
}

interface Answer {
  optionId?: string;
  content?: string;
  isCorrect?: boolean;
  points?: number;
}

interface Question {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  options?: Option[];
  correctAnswer?: string;
  modelAnswer?: string;
}

interface QuestionResultItemProps {
  question: Question;
  index: number;
  answer: Answer | null;
  isCorrect: boolean;
}

export default function QuestionResultItem({
  question,
  index,
  answer,
  isCorrect,
}: QuestionResultItemProps) {
  const getCorrectAnswerOption = () => {
    if (question.type === QuestionType.MULTIPLE_CHOICE && question.options) {
      if (question.correctAnswer && question.correctAnswer.length > 15) {
        return question.options.find(
          (opt) => opt.id === question.correctAnswer
        );
      } else {
        const correctIndex = parseInt(question.correctAnswer || "0", 10);
        if (!isNaN(correctIndex) && question.options[correctIndex]) {
          return question.options[correctIndex];
        }
      }
    }
    return null;
  };

  return (
    <div className="space-y-4">
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

      {question.type === QuestionType.MULTIPLE_CHOICE && question.options && (
        <div className="space-y-3 mt-4">
          {question.options
            .sort((a, b) => a.order - b.order)
            .map((option, optIndex) => {
              const isSelected = answer?.optionId === option.id;
              const correctOption = getCorrectAnswerOption();
              const isCorrectOption = correctOption?.id === option.id;

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
            <p className="text-sm text-gray-600 mb-2">Sizin cavabınız:</p>
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
}
