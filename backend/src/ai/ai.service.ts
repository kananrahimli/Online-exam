import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { QuestionType } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

@Injectable()
export class AiService {
  async generateExam(dto: any) {
    const {
      subject,
      level,
      topic,
      questionCount,
      questionTypes,
      readingText,
      readingQuestionCount,
    } = dto;

    const hasMultipleChoice =
      questionTypes?.includes('MULTIPLE_CHOICE') ||
      questionTypes?.includes(QuestionType.MULTIPLE_CHOICE);
    const hasOpenEnded =
      questionTypes?.includes('OPEN_ENDED') ||
      questionTypes?.includes(QuestionType.OPEN_ENDED);
    const hasReading =
      questionTypes?.includes('READING_COMPREHENSION') ||
      questionTypes?.includes(QuestionType.READING_COMPREHENSION);

    // Calculate question distribution
    let mcCount = 0;
    let oeCount = 0;
    let rcCount = 0;

    if (hasReading) {
      rcCount = readingQuestionCount || 5;
    }

    const remainingQuestions = questionCount - rcCount;

    if (hasMultipleChoice && hasOpenEnded) {
      // 20% açıq suallar
      oeCount = Math.ceil(remainingQuestions * 0.2);
      mcCount = remainingQuestions - oeCount;
    } else if (hasMultipleChoice) {
      mcCount = remainingQuestions;
    } else if (hasOpenEnded) {
      oeCount = remainingQuestions;
    }

    let readingSection = '';
    const readingTextProvided = readingText && readingText.trim().length > 0;

    if (hasReading) {
      if (readingTextProvided) {
        readingSection = `

READING TEXT PROVIDED BY USER:
${readingText}

READING COMPREHENSION SECTION:
- Use the reading text provided above
- Generate EXACTLY ${rcCount} questions based on this text
- Questions MUST test comprehension of the text content
- Type must be: "READING_COMPREHENSION"
- Questions can be multiple choice (with 4 options) or open-ended format
- These questions will appear AFTER the reading text in the exam
`;
      } else {
        readingSection = `

READING COMPREHENSION SECTION:
- NO reading text was provided by user
- You MUST create an appropriate reading text in Azerbaijani (150-300 words)
- The text should be relevant to the topic: ${topic} and subject: ${subject}
- The text should match ${level} difficulty level
- After creating the text, generate EXACTLY ${rcCount} questions based on it
- Type must be: "READING_COMPREHENSION"
- Questions MUST test comprehension of the text you created
- Questions can be multiple choice (with 4 options) or open-ended format
- Include the created text in "readingText" field of the response
`;
      }
    }

    const systemPrompt = `You are an expert exam creator specializing in ${subject} for ${level} level students.

CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
1. Generate EXACTLY ${questionCount} questions in total
${hasReading ? `   - ${rcCount} READING_COMPREHENSION questions` : ''}
${hasMultipleChoice ? `   - ${mcCount} MULTIPLE_CHOICE questions` : ''}
${hasOpenEnded ? `   - ${oeCount} OPEN_ENDED questions (20% of non-reading questions)` : ''}

2. ALL content (questions, options, answers, reading text) MUST be in Azerbaijani language
3. Questions must match ${level} difficulty level
4. Topic: ${topic}
5. Subject: ${subject}

QUESTION TYPE SPECIFICATIONS:

MULTIPLE_CHOICE:
- Must have exactly 4 options (A, B, C, D)
- correctAnswer is the index: 0 for A, 1 for B, 2 for C, 3 for D
- Must include "options" array with 4 items
- Must include "correctAnswer" field
- Must NOT include "modelAnswer" field

OPEN_ENDED:
- Must NOT have "options" field
- Must NOT have "correctAnswer" field
- MUST have "modelAnswer" field with comprehensive correct answer in Azerbaijani
- modelAnswer should be a complete, detailed reference answer

READING_COMPREHENSION:
- Must be based on the provided (or generated) reading text
- Can be either multiple choice format (with options) or open-ended format
- If multiple choice: include options and correctAnswer
- If open-ended: include modelAnswer instead
- These questions will appear AFTER the reading text in the exam
${readingSection}

OUTPUT FORMAT - STRICT JSON:
{
  ${!readingTextProvided && hasReading ? '"readingText": "generated reading text in Azerbaijani (150-300 words)",' : ''}
  "questions": [
    {
      "type": "MULTIPLE_CHOICE" | "OPEN_ENDED" | "READING_COMPREHENSION",
      "content": "question text in Azerbaijani",
      "points": 1,
      "options": [
        { "content": "option A in Azerbaijani" },
        { "content": "option B in Azerbaijani" },
        { "content": "option C in Azerbaijani" },
        { "content": "option D in Azerbaijani" }
      ],
      "correctAnswer": "0",
      "modelAnswer": "detailed answer in Azerbaijani (only for OPEN_ENDED)"
    }
  ]
}

IMPORTANT NOTES:
- Reading comprehension questions should appear FIRST in the questions array
- Then other question types (MULTIPLE_CHOICE and OPEN_ENDED)
- This ensures the reading text appears before its related questions in the exam
${!readingTextProvided && hasReading ? '- Since no reading text was provided, you MUST generate one and include it in "readingText" field' : ''}

VALIDATION CHECKLIST:
✓ Total questions = ${questionCount}
✓ All text in Azerbaijani language
✓ READING_COMPREHENSION questions appear first in array
✓ MULTIPLE_CHOICE: has options + correctAnswer, NO modelAnswer
✓ OPEN_ENDED: has modelAnswer, NO options, NO correctAnswer
✓ Each option array has exactly 4 items
✓ correctAnswer is "0", "1", "2", or "3" (as string)
✓ All questions are relevant to topic: ${topic}
${!readingTextProvided && hasReading ? '✓ readingText field is included with generated text' : ''}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // Using the best model
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate exactly ${questionCount} exam questions following all specifications. Ensure all content is in Azerbaijani language.${!readingTextProvided && hasReading ? ' Generate a reading text since none was provided.' : ''}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent output
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI-dan cavab alınmadı');
      }

      const result = JSON.parse(content);

      // Validate the result
      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error('Yanlış format: questions array tapılmadı');
      }

      if (result.questions.length !== questionCount) {
        console.warn(
          `Warning: Expected ${questionCount} questions but got ${result.questions.length}`,
        );
        // Retry once if count doesn't match
        return this.generateExam(dto);
      }

      // Validate reading text if required but not provided
      if (!readingTextProvided && hasReading && !result.readingText) {
        throw new Error('Mətn yaradılmalı idi, amma yaradılmadı');
      }

      // Validate each question
      for (const q of result.questions) {
        if (!q.type || !q.content) {
          throw new Error('Sualda type və ya content yoxdur');
        }

        if (
          q.type === 'MULTIPLE_CHOICE' ||
          q.type === 'READING_COMPREHENSION'
        ) {
          // READING_COMPREHENSION can be multiple choice format
          if (q.options && q.options.length > 0) {
            if (q.options.length !== 4) {
              throw new Error('Test sualında 4 variant olmalıdır');
            }
            if (q.correctAnswer === undefined) {
              throw new Error('Test sualında correctAnswer olmalıdır');
            }
          }
        }

        if (
          q.type === 'OPEN_ENDED' ||
          (q.type === 'READING_COMPREHENSION' && !q.options)
        ) {
          if (!q.modelAnswer) {
            throw new Error('Açıq sualda modelAnswer olmalıdır');
          }
        }
      }

      return result;
    } catch (error) {
      console.error('AI generation error:', error);
      if (
        error.message.includes('Expected') &&
        error.message.includes('but got')
      ) {
        // If it's a count mismatch, throw a more specific error
        throw new Error(
          `Tələb olunan sual sayı (${questionCount}) yaradılmadı. Yenidən cəhd edin.`,
        );
      }
      throw new Error('İmtahan yaratmaq mümkün olmadı: ' + error.message);
    }
  }

  async regenerateQuestion(
    examId: string,
    questionId: string,
    currentQuestion: any,
    prompt?: string,
  ) {
    const systemPrompt = `You are an expert exam question creator.

TASK: Regenerate a single exam question based on the current question and user feedback.

CURRENT QUESTION:
Type: ${currentQuestion.type}
Content: ${currentQuestion.content}
${currentQuestion.options ? `Options: ${JSON.stringify(currentQuestion.options)}` : ''}
${currentQuestion.correctAnswer ? `Correct Answer: ${currentQuestion.correctAnswer}` : ''}
${currentQuestion.modelAnswer ? `Model Answer: ${currentQuestion.modelAnswer}` : ''}

${prompt ? `USER FEEDBACK: ${prompt}` : ''}

REQUIREMENTS:
1. Keep the same question type: ${currentQuestion.type}
2. ALL content MUST be in Azerbaijani language
3. Follow the same format as the original question
4. If MULTIPLE_CHOICE: include exactly 4 options and correctAnswer
5. If OPEN_ENDED: include modelAnswer only
6. Improve the question based on user feedback if provided

OUTPUT FORMAT - STRICT JSON:
{
  "type": "${currentQuestion.type}",
  "content": "improved question in Azerbaijani",
  "points": ${currentQuestion.points || 1},
  ${currentQuestion.type === 'MULTIPLE_CHOICE' ? '"options": [{"content": "..."}, {"content": "..."}, {"content": "..."}, {"content": "..."}],' : ''}
  ${currentQuestion.type === 'MULTIPLE_CHOICE' ? '"correctAnswer": "0",' : ''}
  ${currentQuestion.type === 'OPEN_ENDED' ? '"modelAnswer": "detailed answer in Azerbaijani"' : ''}
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: prompt || 'Regenerate this question with improvements',
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI-dan cavab alınmadı');
      }

      const result = JSON.parse(content);

      // Validate
      if (!result.type || !result.content) {
        throw new Error('Yanlış format');
      }

      return result;
    } catch (error) {
      console.error('Question regeneration error:', error);
      throw new Error('Sual yenidən yaradıla bilmədi: ' + error.message);
    }
  }
}
