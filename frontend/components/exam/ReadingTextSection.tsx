interface ReadingText {
  id: string;
  content: string;
  order: number;
}

interface ReadingTextSectionProps {
  readingText: ReadingText;
  questionNumbers: number[];
}

export default function ReadingTextSection({
  readingText,
  questionNumbers,
}: ReadingTextSectionProps) {
  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 shadow-sm">
      <p className="text-gray-800 leading-7 text-base whitespace-pre-wrap mb-4">
        {readingText.content}
      </p>

      <div className="border-t border-gray-300 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
          <span className="text-blue-700 font-semibold text-base">İpucu:</span>
        </div>
        <p className="text-sm font-semibold text-blue-900 mb-1">
          Bu mətn əsasında həll edilməli olan suallar:
        </p>
        <p className="text-sm text-blue-800">
          {questionNumbers.map((num) => `Sual ${num}`).join(", ")}
        </p>
      </div>
    </div>
  );
}
