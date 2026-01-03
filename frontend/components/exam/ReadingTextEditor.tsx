import { UseFieldArrayReturn, UseFormRegister, FieldErrors } from "react-hook-form";

interface ReadingTextEditorProps {
  fields: Array<{ id: string; content: string }>;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onAppend: () => void;
  onRemove: (index: number) => void;
}

export default function ReadingTextEditor({
  fields,
  register,
  errors,
  onAppend,
  onRemove,
}: ReadingTextEditorProps) {
  return (
    <div className="border-t pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Mətnlər</h3>
        <button
          type="button"
          onClick={onAppend}
          className="px-4 py-2 bg-indigo-600 whitespace-nowrap text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
        >
          + Mətn Əlavə Et
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
          <p>Hələ heç bir mətn əlavə edilməyib</p>
          <p className="text-sm mt-2">
            Yuxarıdakı düyməyə klik edərək mətn əlavə edin
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border border-gray-200 rounded-lg p-4 bg-blue-50"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">Mətn {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Sil
                </button>
              </div>
              <textarea
                {...register(`readingTexts.${index}.content`)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                placeholder="Mətnin məzmununu buraya yazın..."
              />
              {errors.readingTexts?.[index]?.content && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.readingTexts[index]?.content?.message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

