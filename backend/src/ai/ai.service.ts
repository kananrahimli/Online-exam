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

⚠️ CRITICAL - QUESTION COUNT IS MANDATORY ⚠️
You MUST generate EXACTLY ${questionCount} questions. Not ${questionCount - 1}, not ${questionCount + 1}, but EXACTLY ${questionCount}.

QUESTION DISTRIBUTION (MUST FOLLOW EXACTLY):
${hasReading ? `- READING_COMPREHENSION: exactly ${rcCount} questions` : ''}
${hasMultipleChoice ? `- MULTIPLE_CHOICE: exactly ${mcCount} questions` : ''}
${hasOpenEnded ? `- OPEN_ENDED: exactly ${oeCount} questions (20% of non-reading)` : ''}
TOTAL: ${questionCount} questions

MANDATORY REQUIREMENTS:
1. ALL content (questions, options, answers, reading text) MUST be in Azerbaijani language
2. Questions must match ${level} difficulty level
3. Topic: ${topic}
4. Subject: ${subject}
5. Generate questions in this order:
   ${hasReading ? `a) First ${rcCount} questions: READING_COMPREHENSION` : ''}
   ${hasMultipleChoice ? `b) Next ${mcCount} questions: MULTIPLE_CHOICE` : ''}
   ${hasOpenEnded ? `c) Last ${oeCount} questions: OPEN_ENDED` : ''}

QUESTION TYPE SPECIFICATIONS:

MULTIPLE_CHOICE:
- Must have exactly 4 options (A, B, C, D)
- correctAnswer is the index: 0 for A, 1 for B, 2 for C, 3 for D (MUST be string: "0", "1", "2", or "3")
- Must include "options" array with exactly 4 items
- Must include "correctAnswer" field
- Must NOT include "modelAnswer" field

OPEN_ENDED:
- Must NOT have "options" field
- Must NOT have "correctAnswer" field
- MUST have "modelAnswer" field with comprehensive correct answer in Azerbaijani
- modelAnswer should be a complete, detailed reference answer (2-4 sentences minimum)

READING_COMPREHENSION:
- Must be based on the provided (or generated) reading text
- Can be either multiple choice format (with options) or open-ended format
- If multiple choice: include options (4 items) and correctAnswer
- If open-ended: include modelAnswer instead
- These questions will appear AFTER the reading text in the exam
${readingSection}

OUTPUT FORMAT - STRICT JSON:
{
  ${!readingTextProvided && hasReading ? '"readingText": "generated reading text in Azerbaijani (150-300 words)",' : ''}
  "questions": [
    ${hasReading ? `// First ${rcCount} questions with type: "READING_COMPREHENSION"` : ''}
    ${hasMultipleChoice ? `// Next ${mcCount} questions with type: "MULTIPLE_CHOICE"` : ''}
    ${hasOpenEnded ? `// Last ${oeCount} questions with type: "OPEN_ENDED"` : ''}
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
    // ... continue until you have EXACTLY ${questionCount} questions
  ]
}

⚠️ BEFORE SUBMITTING YOUR RESPONSE:
1. Count the questions in your "questions" array
2. Verify the count is EXACTLY ${questionCount}
3. If not ${questionCount}, add or remove questions until it matches
4. Double-check: questions.length === ${questionCount}

VALIDATION CHECKLIST:
✓ questions.length === ${questionCount} (CRITICAL!)
${hasReading ? `✓ First ${rcCount} questions have type: "READING_COMPREHENSION"` : ''}
${hasMultipleChoice ? `✓ Next ${mcCount} questions have type: "MULTIPLE_CHOICE"` : ''}
${hasOpenEnded ? `✓ Last ${oeCount} questions have type: "OPEN_ENDED"` : ''}
✓ All text in Azerbaijani language
✓ MULTIPLE_CHOICE: has options (4 items) + correctAnswer (string), NO modelAnswer
✓ OPEN_ENDED: has modelAnswer, NO options, NO correctAnswer
✓ correctAnswer values are "0", "1", "2", or "3" (as strings)
✓ All questions are relevant to topic: ${topic}
${!readingTextProvided && hasReading ? '✓ readingText field is included with generated text' : ''}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate EXACTLY ${questionCount} exam questions (${hasReading ? `${rcCount} reading, ` : ''}${hasMultipleChoice ? `${mcCount} multiple choice, ` : ''}${hasOpenEnded ? `${oeCount} open-ended` : ''}).

CRITICAL: Count your questions before responding. The array MUST contain exactly ${questionCount} items.

All content must be in Azerbaijani language.${!readingTextProvided && hasReading ? ' Generate a reading text since none was provided.' : ''}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
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

      // Handle question count mismatch
      if (result.questions.length !== questionCount) {
        console.warn(
          `AI generated ${result.questions.length} questions instead of ${questionCount}. Adjusting...`,
        );

        // If too many questions, trim the excess
        if (result.questions.length > questionCount) {
          result.questions = result.questions.slice(0, questionCount);
          console.log(`Trimmed to ${questionCount} questions`);
        }
        // If too few questions, generate additional ones
        else if (result.questions.length < questionCount) {
          const deficit = questionCount - result.questions.length;
          console.log(`Need ${deficit} more questions. Generating...`);

          // Determine which type of question to add based on what's missing
          let typeToAdd = 'MULTIPLE_CHOICE';
          if (hasOpenEnded && oeCount > 0) {
            typeToAdd = 'OPEN_ENDED';
          }

          // Generate additional questions
          for (let i = 0; i < deficit; i++) {
            const additionalQuestion = await this.generateSingleQuestion(
              subject,
              level,
              topic,
              typeToAdd,
              result.questions.length + i + 1,
            );
            result.questions.push(additionalQuestion);
          }
          console.log(
            `Added ${deficit} questions. Total: ${result.questions.length}`,
          );
        }
      }

      // Validate reading text if required but not provided
      if (!readingTextProvided && hasReading && !result.readingText) {
        console.warn(
          'Reading text was not generated. Creating a placeholder...',
        );
        result.readingText = 'Oxu mətnini buraya əlavə edin.';
      }

      // Validate each question
      for (let i = 0; i < result.questions.length; i++) {
        const q = result.questions[i];

        if (!q.type || !q.content) {
          throw new Error(`Sual ${i + 1}-də type və ya content yoxdur`);
        }

        if (
          q.type === 'MULTIPLE_CHOICE' ||
          q.type === 'READING_COMPREHENSION'
        ) {
          if (q.options && q.options.length > 0) {
            if (q.options.length !== 4) {
              console.warn(
                `Question ${i + 1}: Expected 4 options, got ${q.options.length}`,
              );
            }
            if (q.correctAnswer === undefined || q.correctAnswer === null) {
              throw new Error(`Sual ${i + 1}-də correctAnswer yoxdur`);
            }
          }
        }

        if (
          q.type === 'OPEN_ENDED' ||
          (q.type === 'READING_COMPREHENSION' && !q.options)
        ) {
          if (!q.modelAnswer || q.modelAnswer.trim().length === 0) {
            console.warn(
              `Question ${i + 1}: Open-ended question missing modelAnswer`,
            );
            q.modelAnswer = 'Cavab modeli əlavə edilməlidir.';
          }
        }
      }

      console.log(
        `Final validation: Generated ${result.questions.length} questions (expected ${questionCount})`,
      );
      return result;
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error('İmtahan yaratmaq mümkün olmadı: ' + error.message);
    }
  }

  // Helper function to generate a single question when count is short
  private async generateSingleQuestion(
    subject: string,
    level: string,
    topic: string,
    type: string,
    questionNumber: number,
  ) {
    const systemPrompt = `Generate a single ${type} exam question in Azerbaijani language.

Subject: ${subject}
Level: ${level}
Topic: ${topic}

${
  type === 'MULTIPLE_CHOICE'
    ? `
FORMAT:
{
  "type": "MULTIPLE_CHOICE",
  "content": "question in Azerbaijani",
  "points": 1,
  "options": [
    { "content": "option A" },
    { "content": "option B" },
    { "content": "option C" },
    { "content": "option D" }
  ],
  "correctAnswer": "0"
}
`
    : `
FORMAT:
{
  "type": "OPEN_ENDED",
  "content": "question in Azerbaijani",
  "points": 1,
  "modelAnswer": "detailed answer in Azerbaijani"
}
`
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate question #${questionNumber}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        // Fallback question
        return type === 'MULTIPLE_CHOICE'
          ? {
              type: 'MULTIPLE_CHOICE',
              content: `${topic} haqqında sual ${questionNumber}`,
              points: 1,
              options: [
                { content: 'Variant A' },
                { content: 'Variant B' },
                { content: 'Variant C' },
                { content: 'Variant D' },
              ],
              correctAnswer: '0',
            }
          : {
              type: 'OPEN_ENDED',
              content: `${topic} haqqında açıq sual ${questionNumber}`,
              points: 1,
              modelAnswer: 'Cavab modeli əlavə edilməlidir.',
            };
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating single question:', error);
      // Return fallback question
      return type === 'MULTIPLE_CHOICE'
        ? {
            type: 'MULTIPLE_CHOICE',
            content: `${topic} haqqında sual ${questionNumber}`,
            points: 1,
            options: [
              { content: 'Variant A' },
              { content: 'Variant B' },
              { content: 'Variant C' },
              { content: 'Variant D' },
            ],
            correctAnswer: '0',
          }
        : {
            type: 'OPEN_ENDED',
            content: `${topic} haqqında açıq sual ${questionNumber}`,
            points: 1,
            modelAnswer: 'Cavab modeli əlavə edilməlidir.',
          };
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
