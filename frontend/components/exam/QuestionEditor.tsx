import { UseFieldArrayReturn, UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form";
import { QuestionType } from "@/lib/types";

interface QuestionEditorProps {
  fields: Array<{ id: string }>;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: UseFormWatch<any>;
  readingTextFields: Array<{ id: string }>;
  onAppend: () => void;
  onRemove: (index: number) => void;
}

export default function QuestionEditor({
  fields,
  register,
  errors,
  watch,
  readingTextFields,
  onAppend,
  onRemove,
}: QuestionEditorProps) {
  return (
    <div className="border-t pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Suallar</h3>
        <button
          type="button"
          onClick={onAppend}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
        >
          + Sual Əlavə Et
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Hələ heç bir sual əlavə edilməyib</p>
          <p className="text-sm mt-2">
            Yuxarıdakı düyməyə klik edərək sual əlavə edin
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {fields.map((field, index) => {
            const questionType = watch(`questions.${index}.type`);
            const isMultipleChoice = questionType === QuestionType.MULTIPLE_CHOICE;

            return (
              <div
                key={field.id}
                className="border border-gray-200 rounded-lg p-6 bg-gray-50"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-semibold text-gray-900">Sual {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Sil
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sual Tipi
                      </label>
                      <select
                        {...register(`questions.${index}.type`)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 appearance-none bg-no-repeat bg-right pr-8"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundSize: "14px 14px",
                          backgroundPosition: "right 8px center",
                        }}
                      >
                        <option value={QuestionType.MULTIPLE_CHOICE}>
                          Test sualı
                        </option>
                        <option value={QuestionType.OPEN_ENDED}>
                          Açıq sual
                        </option>
                      </select>
                    </div>

                    {readingTextFields.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Oxuma Mətni (İstəyə bağlı)
                        </label>
                        <select
                          {...register(`questions.${index}.readingTextId`)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 appearance-none bg-no-repeat bg-right pr-8"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundSize: "14px 14px",
                            backgroundPosition: "right 8px center",
                          }}
                        >
                          <option value="">Mətn seçilməyib</option>
                          {readingTextFields.map((rt, rtIndex) => {
                            // Use temp_ format for create page compatibility
                            const tempId = rt.id?.startsWith('temp_') 
                              ? rt.id 
                              : `temp_${rtIndex}`;
                            return (
                              <option key={rt.id || tempId} value={tempId}>
                                Mətn {rtIndex + 1}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sual Mətni *
                    </label>
                    <textarea
                      {...register(`questions.${index}.content`)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                      placeholder="Sual mətni..."
                    />
                    {errors.questions?.[index]?.content && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.questions[index]?.content?.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bal
                      </label>
                      <input
                        type="number"
                        {...register(`questions.${index}.points`, {
                          valueAsNumber: true,
                        })}
                        min={1}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                      />
                    </div>
                  </div>

                  {isMultipleChoice && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variantlar *
                      </label>
                      <div className="space-y-2">
                        {[0, 1, 2, 3].map((optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <span className="w-8 text-sm font-medium text-gray-700">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <input
                              {...register(`questions.${index}.options.${optIndex}.content`)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                              placeholder={`Variant ${String.fromCharCode(65 + optIndex)}`}
                            />
                          </div>
                        ))}
                      </div>
                      {errors.questions?.[index]?.options && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.questions[index]?.options?.message}
                        </p>
                      )}

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Düzgün Cavab *
                        </label>
                        <select
                          {...register(`questions.${index}.correctAnswer`)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 appearance-none bg-no-repeat bg-right pr-8"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundSize: "14px 14px",
                            backgroundPosition: "right 8px center",
                          }}
                        >
                          <option value="">Seçin</option>
                          {[0, 1, 2, 3].map((optIndex) => (
                            <option key={optIndex} value={optIndex.toString()}>
                              {String.fromCharCode(65 + optIndex)}
                            </option>
                          ))}
                        </select>
                        {errors.questions?.[index]?.correctAnswer && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.questions[index]?.correctAnswer?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {questionType === QuestionType.OPEN_ENDED && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nümunə Cavab *
                      </label>
                      <textarea
                        {...register(`questions.${index}.modelAnswer`)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                        placeholder="Nümunə cavab..."
                      />
                      {errors.questions?.[index]?.modelAnswer && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.questions[index]?.modelAnswer?.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

