"use client";

import { useState, useEffect, useRef } from "react";
import { QuestionType } from "@/lib/types";

interface QuestionTypeMultiSelectProps {
  selectedTypes: QuestionType[];
  onChange: (types: QuestionType[]) => void;
  placeholder?: string;
}

const questionTypeOptions = [
  { value: QuestionType.MULTIPLE_CHOICE, label: "Test sualları (çox seçimli)" },
  { value: QuestionType.OPEN_ENDED, label: "Açıq suallar" },
  { value: QuestionType.READING_COMPREHENSION, label: "Mətn əsaslı suallar" },
];

export default function QuestionTypeMultiSelect({
  selectedTypes,
  onChange,
  placeholder = "Sual tipi seçin...",
}: QuestionTypeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  const getSelectedTypesLabel = () => {
    if (selectedTypes.length === 0) return placeholder;
    if (selectedTypes.length === 1) {
      return questionTypeOptions.find((opt) => opt.value === selectedTypes[0])?.label || placeholder;
    }
    return `${selectedTypes.length} tip seçilib`;
  };

  const removeType = (type: QuestionType, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTypes.filter((t) => t !== type));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 bg-white cursor-pointer min-h-[48px] flex items-center justify-between shadow-sm hover:border-gray-400"
      >
        <div className="flex flex-wrap gap-2 flex-1">
          {selectedTypes.length > 0 ? (
            selectedTypes.map((type) => {
              const option = questionTypeOptions.find((opt) => opt.value === type);
              return (
                <span
                  key={type}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                >
                  {option?.label || type}
                  <button
                    type="button"
                    onClick={(e) => removeType(type, e)}
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </span>
              );
            })
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="overflow-y-auto max-h-60">
            {questionTypeOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => toggleType(option.value)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                  selectedTypes.includes(option.value) ? "bg-indigo-50" : ""
                }`}
              >
                <div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                </div>
                {selectedTypes.includes(option.value) && (
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

