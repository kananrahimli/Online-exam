// src/exam-attempt/helpers/exam-questions.helper.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class ExamQuestionsHelper {
  /**
   * Combines questions from topics and regular questions into a single array
   */
  combineAllQuestions(exam: any): any[] {
    const allQuestions = [];

    // Add questions from topics
    if (exam.topics && Array.isArray(exam.topics)) {
      exam.topics.forEach((topic) => {
        if (topic.questions && Array.isArray(topic.questions)) {
          allQuestions.push(...topic.questions);
        }
      });
    }

    // Add regular questions
    if (exam.questions && Array.isArray(exam.questions)) {
      allQuestions.push(...exam.questions);
    }

    return allQuestions;
  }

  /**
   * Maps reading text IDs to reading text objects for questions
   */
  mapReadingTexts(questions: any[], readingTexts: any[]): void {
    if (!readingTexts || readingTexts.length === 0) {
      return;
    }

    const readingTextsMap = new Map(readingTexts.map((rt) => [rt.id, rt]));

    questions.forEach((q: any) => {
      if (q.readingTextId && !q.readingText) {
        q.readingText = readingTextsMap.get(q.readingTextId) || null;
      }
    });
  }

  /**
   * Removes correct answers and model answers from questions
   */
  removeCorrectAnswers(exam: any): void {
    // Remove from regular questions
    if (exam.questions) {
      exam.questions.forEach((q) => {
        delete q.correctAnswer;
        delete q.modelAnswer;
      });
    }

    // Remove from topic questions
    if (exam.topics) {
      exam.topics.forEach((topic) => {
        if (topic.questions) {
          topic.questions.forEach((q) => {
            delete q.correctAnswer;
            delete q.modelAnswer;
          });
        }
      });
    }
  }

  /**
   * Prepares exam with combined questions and mapped reading texts
   */
  prepareExamWithQuestions(exam: any): any {
    // Remove correct answers for student view
    this.removeCorrectAnswers(exam);

    // Combine all questions
    const allQuestions = this.combineAllQuestions(exam);

    // Map reading texts
    if (exam.readingTexts) {
      this.mapReadingTexts(allQuestions, exam.readingTexts);
    }

    return {
      ...exam,
      allQuestions,
    };
  }
}
