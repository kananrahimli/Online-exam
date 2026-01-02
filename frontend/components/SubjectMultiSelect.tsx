"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

interface SubjectMultiSelectProps {
  selectedSubjects: string[];
  onChange: (subjects: string[]) => void;
  placeholder?: string;
}

export default function SubjectMultiSelect({
  selectedSubjects,
  onChange,
  placeholder = "Fənn seçin...",
}: SubjectMultiSelectProps) {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await api.get("/exams/subjects");
      setSubjects(response.data || []);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    const searchLower = searchTerm.toLowerCase();
    return subject.toLowerCase().includes(searchLower);
  });

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      onChange(selectedSubjects.filter((s) => s !== subject));
    } else {
      onChange([...selectedSubjects, subject]);
    }
  };

  const removeSubject = (subject: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedSubjects.filter((s) => s !== subject));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 bg-white cursor-pointer min-h-[48px] flex items-center justify-between shadow-sm hover:border-gray-400"
      >
        <div className="flex flex-wrap gap-2 flex-1">
          {selectedSubjects.length > 0 ? (
            selectedSubjects.map((subject) => (
              <span
                key={subject}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
              >
                {subject}
                <button
                  type="button"
                  onClick={(e) => removeSubject(subject, e)}
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                >
                  ×
                </button>
              </span>
            ))
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
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Fənn axtar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Yüklənir...</div>
            ) : filteredSubjects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? "Nəticə tapılmadı" : "Fənn yoxdur"}
              </div>
            ) : (
              filteredSubjects.map((subject) => (
                <div
                  key={subject}
                  onClick={() => toggleSubject(subject)}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                    selectedSubjects.includes(subject) ? "bg-indigo-50" : ""
                  }`}
                >
                  <div className="font-medium text-gray-900">{subject}</div>
                  {selectedSubjects.includes(subject) && (
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

