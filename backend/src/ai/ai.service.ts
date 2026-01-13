import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { QuestionType } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

@Injectable()
export class AiService {
  // Helper function to check for duplicate or similar questions
  private isDuplicateQuestion(
    newQuestion: string,
    existingQuestions: string[],
  ): boolean {
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[?.!,]/g, '')
        .trim();

    const newNormalized = normalize(newQuestion);

    for (const existing of existingQuestions) {
      const existingNormalized = normalize(existing);

      // Exact match
      if (newNormalized === existingNormalized) {
        return true;
      }

      // Similarity check (simple word overlap)
      const newWords = new Set(newNormalized.split(/\s+/));
      const existingWords = new Set(existingNormalized.split(/\s+/));
      const intersection = new Set(
        [...newWords].filter((x) => existingWords.has(x)),
      );

      // If more than 70% words overlap, consider it duplicate
      const similarity =
        intersection.size / Math.min(newWords.size, existingWords.size);
      if (similarity > 0.7) {
        return true;
      }
    }

    return false;
  }

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
- ALL questions MUST be multiple choice format (with exactly 4 options)
- Questions should cover DIFFERENT aspects: main idea, specific details, inference, vocabulary, character analysis, sequence of events
- Each question must be UNIQUE - no repetition or similarity
- These questions will appear AFTER the reading text in the exam
`;
      } else {
        readingSection = `

READING COMPREHENSION SECTION - TEXT GENERATION REQUIREMENTS:
- NO reading text was provided by user
- You MUST create an appropriate reading text in Azerbaijani

TEXT FORMAT GUIDELINES (choose based on level):
For Elementary/Middle School (Başlanğıc/Orta sinif):
  - Create a short story, folk tale, or fairy tale (nağıl)
  - 150-250 words
  - Simple, engaging narrative with moral lesson
  - Age-appropriate vocabulary and themes
  - Example themes: friendship, honesty, nature, family

For High School/University (Ali/Universitet):
  - Create an informative article or essay (məqalə)
  - 200-300 words
  - Follow DİM (Dövlət İmtahan Mərkəzi) standards
  - Academic tone, structured paragraphs
  - Topics: science, history, culture, society, technology
  - Include introduction, body, conclusion

MANDATORY TEXT REQUIREMENTS:
- Text must be relevant to subject: ${subject}
- Text must relate to topic: ${topic}
- Text must match ${level} difficulty level
- Use proper Azerbaijani grammar and vocabulary
- Text should be interesting and educational
- NO generic placeholder text

After creating the text, generate EXACTLY ${rcCount} questions:
- Type must be: "READING_COMPREHENSION"
- Questions MUST test comprehension of the text you created
- ALL questions MUST be multiple choice format (with exactly 4 options)
- Questions should follow DİM format (clear, unambiguous, one correct answer)
- Questions should cover DIFFERENT aspects: main idea, specific details, inference, vocabulary, character analysis, sequence of events
- Each question must be UNIQUE - test different parts of the text
- Include the created text in "readingText" field of the response
`;
      }
    }

    const systemPrompt = `You are an expert exam creator specializing in ${subject} for ${level} level students.
Your questions must follow Dövlət İmtahan Mərkəzi (DİM) standards - clear, unambiguous, academically rigorous.
You must return your response as a valid JSON object.

⚠️ CRITICAL - QUESTION COUNT AND UNIQUENESS ARE MANDATORY ⚠️
You MUST generate EXACTLY ${questionCount} UNIQUE, NON-REPEATING questions following Bloom's Taxonomy levels.
- Each question must be distinctly different in content, approach, and cognitive level
- NO similar or duplicate questions
- Cover different aspects of the topic with varied cognitive demands
- Verify uniqueness: each question tests different knowledge/skills at different levels

BLOOM'S TAXONOMY LEVELS TO INCLUDE:
1. Xatırlama (Remember): Faktları, terminləri xatırlamaq - "Nədir?", "Hansıdır?"
2. Anlama (Understand): İzah etmək, təsvir etmək - "Niyə?", "Necə?"
3. Tətbiq (Apply): Bilikləri yeni vəziyyətlərdə istifadə - "Hansı halda?", "Nümunə verin"
4. Təhlil (Analyze): Elementləri ayırmaq, əlaqələri tapmaq - "Fərq nədir?", "Müqayisə edin"
5. Qiymətləndirmə (Evaluate): Mühakimə yürütmək - "Düzgündürmü?", "Qiymətləndirin"
6. Yaratma (Create): Yeni kombinasiyalar - "Necə yaratmaq olar?"

QUESTION DISTRIBUTION (MUST FOLLOW EXACTLY):
${hasReading ? `- READING_COMPREHENSION: exactly ${rcCount} questions (ALL must be multiple choice with 4 options, covering DIFFERENT aspects of the text)` : ''}
${hasMultipleChoice ? `- MULTIPLE_CHOICE: exactly ${mcCount} questions (distributed across Bloom's levels)` : ''}
${hasOpenEnded ? `- OPEN_ENDED: exactly ${oeCount} questions (20% of non-reading, higher Bloom's levels - Analyze, Evaluate, Create)` : ''}
TOTAL: ${questionCount} questions

MANDATORY REQUIREMENTS:
1. ALL content (questions, options, answers, reading text) MUST be in Azerbaijani language
2. Questions must match ${level} difficulty level
3. Topic: ${topic}
4. Subject: ${subject}
5. Follow DİM (Dövlət İmtahan Mərkəzi) question format standards
6. Each question must be UNIQUE - no repetition or similarity
7. Questions must cover DIFFERENT Bloom's Taxonomy levels
8. Generate questions in this order:
   ${hasReading ? `a) First ${rcCount} questions: READING_COMPREHENSION (ALL must be multiple choice, cover DIFFERENT aspects)` : ''}
   ${hasMultipleChoice ? `b) Next ${mcCount} questions: MULTIPLE_CHOICE (varied Bloom's levels)` : ''}
   ${hasOpenEnded ? `c) Last ${oeCount} questions: OPEN_ENDED (higher cognitive levels)` : ''}

UNIQUENESS REQUIREMENTS - CRITICAL:
- NO TWO QUESTIONS should ask about the same concept in the same way
- Vary question formats: definition, comparison, application, analysis, evaluation
- Cover different subtopics within ${topic}
- Use different vocabulary and phrasing for each question
- Test different cognitive skills (remember, understand, apply, analyze, evaluate, create)
- If about grammar: cover different rules, different examples, different aspects
- If about reading: ask about main idea, details, inference, vocabulary, sequence, character, theme (all different)

QUESTION TYPE SPECIFICATIONS:
MULTIPLE_CHOICE (DİM Format):
- Must have exactly 4 options (A, B, C, D)
- Options must be MEANINGFUL, SPECIFIC, and CONCRETE - real answers related to the question
- Options must be clear, distinct, and plausible
- Only ONE correct answer - make sure the correctAnswer field points to the ACTUALLY correct option
- Distractors (wrong answers) should be reasonable but clearly incorrect
- Avoid generic options like "Hamısı", "Heç biri", "Variant A", "Seçim B" - ALL options must be meaningful content
- Each option must be a COMPLETE, MEANINGFUL answer, not a placeholder
- correctAnswer is the index: 0 for A, 1 for B, 2 for C, 3 for D (MUST be string: "0", "1", "2", or "3")
- You MUST carefully verify which option is correct before setting correctAnswer
- Must include "options" array with exactly 4 items, each with meaningful "content"
- Must include "correctAnswer" field pointing to the correct option index
- Must NOT include "modelAnswer" field
- Question must be clear, unambiguous, and test SPECIFIC knowledge
- Questions must be CONCRETE and MEANINGFUL - test real knowledge, not vague concepts
- Vary cognitive levels: some Remember, some Understand, some Apply, some Analyze
- Examples:
  ❌ BAD: Options: ["Variant A", "Variant B", "Variant C", "Variant D"]
  ✅ GOOD: Options: ["İşıq enerjisi kimyəvi enerjiyə çevrilir", "Kimyəvi enerji işıq enerjisinə çevrilir", "İstilik enerjisi mexaniki enerjiyə çevrilir", "Mexaniki enerji istilik enerjisinə çevrilir"]

OPEN_ENDED (DİM Format):
- Must NOT have "options" field
- Must NOT have "correctAnswer" field
- MUST have "modelAnswer" field
- modelAnswer must be CONCISE and SPECIFIC (1-2 sentences maximum)
- modelAnswer should be the EXACT expected answer, not an explanation
- Format: Direct answer only, no elaboration
- Focus on higher cognitive levels: Analyze, Evaluate, Create
- Example GOOD: "Fotosintez zamanı bitkilər işıq enerjisini kimyəvi enerjiyə çevirir."
- Example BAD: "Fotosintez prosesi çox mühümdür və bu zaman bitkilər..." (too long)

READING_COMPREHENSION:
- Must be based on the provided (or generated) reading text
- Type must be: "READING_COMPREHENSION"
- Questions MUST be multiple choice format (with 4 options)
- Must include "options" array with exactly 4 items
- Must include "correctAnswer" field (index: 0, 1, 2, or 3 as string)
- Must NOT include "modelAnswer" field
- Questions should test DIFFERENT aspects:
  * Question 1: Main idea or theme
  * Question 2: Specific detail or fact
  * Question 3: Inference or implicit meaning
  * Question 4: Vocabulary in context
  * Question 5: Sequence of events or character motivation
- Follow DİM reading comprehension question standards
- These questions will appear AFTER the reading text in the exam
${readingSection}

EXAMPLES OF VARIED QUESTIONS (NOT TO COPY, JUST FOR REFERENCE):
❌ BAD (Similar): 
  - "Kök nədir?"
  - "Kök hansıdır?"
  - "Kök sözün hansı hissəsidir?"
  
✅ GOOD (Different):
  - "Kök nədir?" (Remember - definition)
  - "'Kitabxana' sözündə neçə kök var?" (Apply - identify)
  - "Kök və şəkilçi arasındakı əsas fərq nədir?" (Analyze - compare)
  - "Mürəkkəb söz yaratmaq üçün köklər necə birləşdirilir?" (Understand - process)

OUTPUT FORMAT - STRICT JSON:
{
  ${!readingTextProvided && hasReading ? '"readingText": "generated reading text following format guidelines above (150-300 words)",' : ''}
  "questions": [
    ${hasReading ? `// First ${rcCount} UNIQUE questions with type: "READING_COMPREHENSION" (ALL multiple choice, each testing DIFFERENT aspect)` : ''}
    ${hasMultipleChoice ? `// Next ${mcCount} UNIQUE questions with type: "MULTIPLE_CHOICE" (varied Bloom's levels)` : ''}
    ${hasOpenEnded ? `// Last ${oeCount} UNIQUE questions with type: "OPEN_ENDED" (higher cognitive levels)` : ''}
    {
      "type": "MULTIPLE_CHOICE" | "OPEN_ENDED" | "READING_COMPREHENSION",
      "content": "question text in Azerbaijani (DİM format, unique cognitive level)",
      "points": 1,
      "options": [
        { "content": "meaningful option A in Azerbaijani" },
        { "content": "meaningful option B in Azerbaijani" },
        { "content": "meaningful option C in Azerbaijani" },
        { "content": "meaningful option D in Azerbaijani" }
      ],
      "correctAnswer": "0",
      "modelAnswer": "concise direct answer (1-2 sentences max, only for OPEN_ENDED)"
    }
    // ... continue until you have EXACTLY ${questionCount} UNIQUE questions
  ]
}

⚠️ BEFORE SUBMITTING YOUR RESPONSE - CRITICAL CHECKS:
1. Count the questions in your "questions" array
2. Verify the count is EXACTLY ${questionCount}
3. Verify each question is UNIQUE (no similar content, different cognitive levels)
4. Check that reading questions cover DIFFERENT aspects (main idea, detail, inference, vocabulary, sequence)
5. Check that multiple choice questions vary in Bloom's levels
6. ${hasOpenEnded ? 'Check that open-ended questions are at higher cognitive levels (Analyze/Evaluate/Create)' : 'DO NOT generate OPEN_ENDED questions - only generate the specified types'}
7. ${hasOpenEnded ? 'Check that open-ended modelAnswers are concise (1-2 sentences)' : ''}
8. VERIFY ALL MULTIPLE_CHOICE questions have MEANINGFUL options (not "Variant A", "Seçim B", etc.)
9. VERIFY ALL correctAnswer fields point to the ACTUALLY correct option (double-check each one)
10. Verify all questions are CONCRETE and MEANINGFUL - test real, specific knowledge
11. If not ${questionCount}, add or remove questions until it matches
12. Double-check: questions.length === ${questionCount}
13. Verify NO duplicate or very similar questions exist

VALIDATION CHECKLIST:
✓ questions.length === ${questionCount} (CRITICAL!)
✓ All questions are UNIQUE (no repetition or similarity)
✓ Questions cover different Bloom's Taxonomy levels
${hasReading ? `✓ First ${rcCount} questions have type: "READING_COMPREHENSION" (ALL multiple choice with 4 options, testing DIFFERENT aspects)` : ''}
${hasMultipleChoice ? `✓ Next ${mcCount} questions have type: "MULTIPLE_CHOICE" (varied cognitive levels)` : ''}
${hasOpenEnded ? `✓ Last ${oeCount} questions have type: "OPEN_ENDED" with CONCISE modelAnswer (1-2 sentences), higher cognitive levels` : ''}
✓ All text in Azerbaijani language
✓ All questions follow DİM format standards
✓ READING_COMPREHENSION: has options (4 items) + correctAnswer (string), NO modelAnswer
✓ MULTIPLE_CHOICE: has options (4 meaningful items) + correctAnswer (string), NO modelAnswer
✓ OPEN_ENDED: has CONCISE modelAnswer (1-2 sentences), NO options, NO correctAnswer
✓ Each option array has exactly 4 items with meaningful content
✓ correctAnswer is "0", "1", "2", or "3" (as string)
✓ All questions are relevant to topic: ${topic}
✓ NO two questions are similar or duplicate
${!readingTextProvided && hasReading ? '✓ readingText field follows format guidelines (story/folk tale for young, article for advanced)' : ''}`;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate EXACTLY ${questionCount} UNIQUE exam questions following all specifications. 
CRITICAL REQUIREMENTS:
- Ensure all content is in Azerbaijani language
- Each question must be CONCRETE, MEANINGFUL, and test SPECIFIC knowledge
- All MULTIPLE_CHOICE options must be MEANINGFUL answers (NOT "Variant A", "Seçim B", etc.)
- VERIFY that correctAnswer field points to the ACTUALLY correct option for each question
- Each question must be distinctly different in content and cognitive level
- Cover different Bloom's Taxonomy levels
- ${hasReading ? 'Reading questions must cover DIFFERENT aspects (main idea, detail, inference, vocabulary, sequence).' : ''}
- ${!readingTextProvided && hasReading ? `Generate an appropriate reading text (story/folk tale for young students, article for advanced students) since none was provided.` : ''}
- ${hasOpenEnded ? 'Make sure open-ended question answers are CONCISE (1-2 sentences only).' : 'DO NOT generate OPEN_ENDED questions - only generate MULTIPLE_CHOICE' + (hasReading ? ' and READING_COMPREHENSION' : '') + ' questions.'}
- Follow DİM standards for all questions
- All questions must be SPECIFIC and test REAL knowledge
Return the response as a valid JSON object.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7, // Increased for more variety
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

      // Check and fix duplicate questions by regenerating them
      const maxRetries = 5;
      let retryCount = 0;
      let hasDuplicates = true;

      while (hasDuplicates && retryCount < maxRetries) {
        const questionContents = result.questions.map((q: any) => q.content);
        const duplicateIndices = new Set<number>();

        // Find all duplicate pairs
        for (let i = 0; i < questionContents.length; i++) {
          for (let j = i + 1; j < questionContents.length; j++) {
            if (
              this.isDuplicateQuestion(questionContents[i], [
                questionContents[j],
              ])
            ) {
              duplicateIndices.add(j); // Regenerate the second duplicate (j)
            }
          }
        }

        if (duplicateIndices.size === 0) {
          hasDuplicates = false;
          break;
        }

        console.warn(
          `Oxşar suallar aşkarlandı (${duplicateIndices.size} sual). Yenidən yaradılır... (Cəhd ${retryCount + 1}/${maxRetries})`,
        );

        // Regenerate duplicate questions one by one
        const existingQuestions = result.questions.map((q: any) => q.content);
        const sortedDuplicateIndices = Array.from(duplicateIndices).sort(
          (a, b) => b - a,
        ); // Sort descending to avoid index shifting

        for (const duplicateIndex of sortedDuplicateIndices) {
          const duplicateQuestion = result.questions[duplicateIndex];
          if (!duplicateQuestion) continue;

          // Determine question type
          const isReadingComprehension =
            duplicateQuestion.type === 'READING_COMPREHENSION' ||
            duplicateQuestion.type === QuestionType.READING_COMPREHENSION ||
            (duplicateIndex < rcCount && hasReading);

          let questionType = duplicateQuestion.type;
          if (isReadingComprehension) {
            questionType = 'MULTIPLE_CHOICE'; // READING_COMPREHENSION is converted to MULTIPLE_CHOICE later
          }

          try {
            // Generate replacement question
            const replacementQuestion = await this.generateSingleQuestion(
              subject,
              level,
              topic,
              questionType,
              duplicateIndex + 1,
              existingQuestions,
            );

            // Replace the duplicate question
            result.questions[duplicateIndex] = replacementQuestion;
            existingQuestions[duplicateIndex] = replacementQuestion.content;

            console.log(
              `Sual ${duplicateIndex + 1} yenidən yaradıldı və əvəz edildi`,
            );
          } catch (error) {
            console.error(
              `Sual ${duplicateIndex + 1} yenidən yaratmaq mümkün olmadı:`,
              error.message,
            );
            // Continue with other duplicates
          }
        }

        retryCount++;
      }

      if (hasDuplicates) {
        console.error(
          `Maksimum cəhd sayına (${
            maxRetries
          }) çatıldı. Bəzi oxşar suallar hələ də mövcuddur.`,
        );
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

          // Get existing question contents to avoid duplicates
          const existingQuestions = result.questions.map((q: any) => q.content);

          // Determine which type of question to add based on what's missing
          let typeToAdd = 'MULTIPLE_CHOICE';
          if (hasOpenEnded && oeCount > 0) {
            const currentOpenEnded = result.questions.filter(
              (q: any) => q.type === 'OPEN_ENDED',
            ).length;
            if (currentOpenEnded < oeCount) {
              typeToAdd = 'OPEN_ENDED';
            }
          }

          // Generate additional questions
          for (let i = 0; i < deficit; i++) {
            const additionalQuestion = await this.generateSingleQuestion(
              subject,
              level,
              topic,
              typeToAdd,
              result.questions.length + i + 1,
              existingQuestions,
            );
            result.questions.push(additionalQuestion);
            existingQuestions.push(additionalQuestion.content);
          }
          console.log(
            `Added ${deficit} questions. Total: ${result.questions.length}`,
          );
        }
      }

      // Extract reading text from AI response
      const aiReadingText = result.readingText || '';
      const finalReadingText =
        readingTextProvided || aiReadingText
          ? readingTextProvided
            ? readingText
            : aiReadingText
          : null;

      // Convert READING_COMPREHENSION questions to MULTIPLE_CHOICE
      // Count reading questions to ensure we don't exceed rcCount
      let readingQuestionsProcessed = 0;
      const processedQuestions = result.questions.map(
        (q: any, index: number) => {
          if (!q.type || !q.content) {
            throw new Error(`Sual ${index + 1}-də type və ya content yoxdur`);
          }

          // Check if this is a reading comprehension question
          const isReadingType =
            q.type === 'READING_COMPREHENSION' ||
            q.type === QuestionType.READING_COMPREHENSION;

          // Only treat as reading comprehension if:
          // 1. It's a reading type AND
          // 2. We haven't exceeded rcCount yet AND
          // 3. Reading questions are enabled
          const isReadingComprehension =
            isReadingType && readingQuestionsProcessed < rcCount && hasReading;

          if (isReadingComprehension) {
            if (!q.options || q.options.length === 0) {
              console.error(
                `Question ${index + 1}: Reading comprehension question missing options`,
              );
              throw new Error(
                `Oxu sualı ${index + 1}-də variantlar mövcud deyil`,
              );
            }
            if (q.options.length !== 4) {
              console.warn(
                `Question ${index + 1}: Expected 4 options, got ${q.options.length}`,
              );
            }
            // Check for placeholder options
            const hasPlaceholders = q.options.some(
              (opt: any) =>
                !opt.content ||
                opt.content.trim().length === 0 ||
                /variant\s*[a-d]/i.test(opt.content) ||
                /seçim\s*[a-d]/i.test(opt.content) ||
                /option\s*[a-d]/i.test(opt.content),
            );
            if (hasPlaceholders) {
              console.error(
                `Question ${index + 1}: Contains placeholder options instead of meaningful answers`,
              );
              throw new Error(
                `Oxu sualı ${index + 1}-də variantlar mənalı deyil. Zəhmət olmasa, hər variant real cavab olmalıdır.`,
              );
            }
            if (q.correctAnswer === undefined || q.correctAnswer === null) {
              throw new Error(`Sual ${index + 1}-də correctAnswer yoxdur`);
            }
            // Validate correctAnswer index
            const correctAnswerIndex = parseInt(String(q.correctAnswer));
            if (
              isNaN(correctAnswerIndex) ||
              correctAnswerIndex < 0 ||
              correctAnswerIndex > 3
            ) {
              throw new Error(
                `Oxu sualı ${index + 1}-də correctAnswer düzgün deyil. 0-3 arası olmalıdır.`,
              );
            }
            readingQuestionsProcessed++; // Increment counter
            return {
              type: QuestionType.MULTIPLE_CHOICE,
              content: q.content,
              points: q.points || 1,
              options: q.options,
              correctAnswer: String(q.correctAnswer),
              readingTextId: 'temp_0',
            };
          }

          // Validate MULTIPLE_CHOICE questions
          if (
            q.type === 'MULTIPLE_CHOICE' ||
            q.type === QuestionType.MULTIPLE_CHOICE
          ) {
            if (!q.options || q.options.length === 0) {
              console.error(
                `Question ${index + 1}: Multiple choice question missing options`,
              );
              throw new Error(`Sual ${index + 1}-də variantlar mövcud deyil`);
            }
            if (q.options.length !== 4) {
              console.warn(
                `Question ${index + 1}: Expected 4 options, got ${q.options.length}`,
              );
            }
            // Check for placeholder options
            const hasPlaceholders = q.options.some(
              (opt: any) =>
                !opt.content ||
                opt.content.trim().length === 0 ||
                /variant\s*[a-d]/i.test(opt.content) ||
                /seçim\s*[a-d]/i.test(opt.content) ||
                /option\s*[a-d]/i.test(opt.content),
            );
            if (hasPlaceholders) {
              console.error(
                `Question ${index + 1}: Contains placeholder options instead of meaningful answers`,
              );
              throw new Error(
                `Sual ${index + 1}-də variantlar mənalı deyil. Zəhmət olmasa, hər variant real cavab olmalıdır.`,
              );
            }
            if (q.correctAnswer === undefined || q.correctAnswer === null) {
              throw new Error(`Sual ${index + 1}-də correctAnswer yoxdur`);
            }
            // Validate correctAnswer index
            const correctAnswerIndex = parseInt(String(q.correctAnswer));
            if (
              isNaN(correctAnswerIndex) ||
              correctAnswerIndex < 0 ||
              correctAnswerIndex > 3
            ) {
              throw new Error(
                `Sual ${index + 1}-də correctAnswer düzgün deyil. 0-3 arası olmalıdır.`,
              );
            }
            return {
              type: QuestionType.MULTIPLE_CHOICE,
              content: q.content,
              points: q.points || 1,
              options: q.options,
              correctAnswer: String(q.correctAnswer),
            };
          }

          // Validate OPEN_ENDED questions
          if (q.type === 'OPEN_ENDED' || q.type === QuestionType.OPEN_ENDED) {
            // Check if OPEN_ENDED questions were requested
            if (!hasOpenEnded) {
              console.error(
                `Question ${index + 1}: OPEN_ENDED question generated but not requested`,
              );
              throw new Error(
                `Sual ${index + 1}: Açıq sual yaradıldı, amma siz açıq sual tipini seçməmisiniz. Zəhmət olmasa, yenidən cəhd edin.`,
              );
            }
            if (!q.modelAnswer || q.modelAnswer.trim().length === 0) {
              console.warn(
                `Question ${index + 1}: Open-ended question missing modelAnswer`,
              );
              q.modelAnswer = 'Cavab əlavə edilməlidir.';
            }
            // Ensure modelAnswer is concise
            const sentences = q.modelAnswer
              .split('.')
              .filter((s: string) => s.trim());
            if (sentences.length > 2) {
              console.warn(
                `Question ${index + 1}: ModelAnswer too long, truncating to 2 sentences`,
              );
              q.modelAnswer = sentences.slice(0, 2).join('.') + '.';
            }
            return {
              type: QuestionType.OPEN_ENDED,
              content: q.content,
              points: q.points || 1,
              modelAnswer: q.modelAnswer,
            };
          }

          // If type is unknown, throw error
          throw new Error(`Sual ${index + 1}: Naməlum sual tipi "${q.type}"`);
        },
      );

      // Final duplicate check on processed questions (with retry mechanism)
      let finalRetryCount = 0;
      const maxFinalRetries = 3;
      let finalHasDuplicates = true;

      while (finalHasDuplicates && finalRetryCount < maxFinalRetries) {
        const finalQuestionContents = processedQuestions.map(
          (q: any) => q.content,
        );
        const finalDuplicateIndices = new Set<number>();

        // Find duplicate pairs
        for (let i = 0; i < finalQuestionContents.length; i++) {
          for (let j = i + 1; j < finalQuestionContents.length; j++) {
            if (
              this.isDuplicateQuestion(finalQuestionContents[i], [
                finalQuestionContents[j],
              ])
            ) {
              finalDuplicateIndices.add(j); // Regenerate the second duplicate
            }
          }
        }

        if (finalDuplicateIndices.size === 0) {
          finalHasDuplicates = false;
          break;
        }

        console.warn(
          `Final yoxlamada oxşar suallar tapıldı (${finalDuplicateIndices.size} sual). Yenidən yaradılır... (Cəhd ${finalRetryCount + 1}/${maxFinalRetries})`,
        );

        // Regenerate duplicate questions
        const existingFinalQuestions = processedQuestions.map(
          (q: any) => q.content,
        );
        const sortedFinalDuplicateIndices = Array.from(
          finalDuplicateIndices,
        ).sort((a, b) => b - a);

        for (const duplicateIndex of sortedFinalDuplicateIndices) {
          const duplicateQuestion = processedQuestions[duplicateIndex];
          if (!duplicateQuestion) continue;

          // Determine question type from processed question
          const questionType =
            duplicateQuestion.type === QuestionType.OPEN_ENDED
              ? 'OPEN_ENDED'
              : 'MULTIPLE_CHOICE';

          try {
            const replacementQuestion = await this.generateSingleQuestion(
              subject,
              level,
              topic,
              questionType,
              duplicateIndex + 1,
              existingFinalQuestions,
            );

            // Convert replacement question to match processed format
            if (questionType === 'OPEN_ENDED') {
              processedQuestions[duplicateIndex] = {
                type: QuestionType.OPEN_ENDED,
                content: replacementQuestion.content,
                points: replacementQuestion.points || 1,
                modelAnswer: replacementQuestion.modelAnswer,
              };
            } else {
              // MULTIPLE_CHOICE or READING_COMPREHENSION
              const isReading = duplicateQuestion.readingTextId;
              processedQuestions[duplicateIndex] = {
                type: QuestionType.MULTIPLE_CHOICE,
                content: replacementQuestion.content,
                points: replacementQuestion.points || 1,
                options: replacementQuestion.options,
                correctAnswer: String(replacementQuestion.correctAnswer),
                ...(isReading ? { readingTextId: 'temp_0' } : {}),
              };
            }

            existingFinalQuestions[duplicateIndex] =
              replacementQuestion.content;
            console.log(
              `Final sual ${duplicateIndex + 1} yenidən yaradıldı və əvəz edildi`,
            );
          } catch (error) {
            console.error(
              `Final sual ${duplicateIndex + 1} yenidən yaratmaq mümkün olmadı:`,
              error.message,
            );
          }
        }

        finalRetryCount++;
      }

      if (finalHasDuplicates) {
        console.warn(
          `Final yoxlamada maksimum cəhd sayına (${
            maxFinalRetries
          }) çatıldı. Bəzi oxşar suallar hələ də mövcud ola bilər.`,
        );
      }

      // Strict validation: question count must match exactly
      if (processedQuestions.length !== questionCount) {
        throw new Error(
          `Sual sayı uyğun gəlmir: tələb olunan ${questionCount}, yaradılan ${processedQuestions.length}`,
        );
      }

      // Validate reading question count
      const readingQuestions = processedQuestions.filter(
        (q: any) => q.readingTextId,
      ).length;
      if (hasReading && readingQuestions !== rcCount) {
        throw new Error(
          `Oxu suallarının sayı uyğun gəlmir: tələb olunan ${rcCount}, yaradılan ${readingQuestions}`,
        );
      }

      // Format response
      const formattedResponse: any = {
        questions: processedQuestions,
      };

      // Add readingTexts array if reading text exists
      if (
        hasReading &&
        finalReadingText &&
        finalReadingText.trim().length > 0
      ) {
        formattedResponse.readingTexts = [
          {
            content: finalReadingText,
          },
        ];
      } else if (hasReading) {
        throw new Error('Oxu mətni yaradıla bilmədi');
      }

      console.log(
        `✅ Final validation successful: Generated ${processedQuestions.length} unique questions (expected ${questionCount})`,
      );
      console.log(`📖 Reading comprehension questions: ${readingQuestions}`);
      console.log(`❌ No duplicate questions found`);

      return formattedResponse;
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
    existingQuestions: string[] = [],
  ) {
    const systemPrompt = `Generate a single ${type} exam question in Azerbaijani language following DİM (Dövlət İmtahan Mərkəzi) standards. You must return the response as a valid JSON object.

Subject: ${subject}
Level: ${level}
Topic: ${topic}

CRITICAL: This question must be UNIQUE and completely different from these existing questions:
${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

UNIQUENESS REQUIREMENTS:
- Must test different knowledge/concept than existing questions
- Use different vocabulary and phrasing
- Cover different aspect of the topic
- Apply different Bloom's Taxonomy level
- NO similarity to existing questions

REQUIREMENTS:
- Follow DİM format standards
- Be clear and unambiguous
- Return response as JSON format
- Match ${level} difficulty level

${
  type === 'MULTIPLE_CHOICE'
    ? `
MULTIPLE_CHOICE FORMAT (DİM Standards):
{
"type": "MULTIPLE_CHOICE",
"content": "unique question in Azerbaijani (different from existing)",
"points": 1,
"options": [
{ "content": "meaningful option A (not 'Variant A')" },
{ "content": "meaningful option B (not 'Variant B')" },
{ "content": "meaningful option C (not 'Variant C')" },
{ "content": "meaningful option D (not 'Variant D')" }
],
"correctAnswer": "0"
}

IMPORTANT: 
- Options must be REAL, MEANINGFUL answers related to the question
- Options must be distinct and plausible
- NO generic placeholders like "Variant A", "Variant B"
- Example GOOD: {"content": "İşıq enerjisi kimyəvi enerjiyə çevrilir"}
- Example BAD: {"content": "Variant A"}
`
    : `
OPEN_ENDED FORMAT (DİM Standards):
{
"type": "OPEN_ENDED",
"content": "unique question in Azerbaijani (higher cognitive level)",
"points": 1,
"modelAnswer": "concise, direct answer in 1-2 sentences maximum"
}

IMPORTANT:
- modelAnswer must be CONCISE (1-2 sentences only)
- Direct answer only, no elaboration
- Focus on higher Bloom's levels (Analyze, Evaluate, Create)
- Example GOOD: "Fotosintez zamanı bitkilər işıq enerjisini kimyəvi enerjiyə çevirir."
- Example BAD: "Fotosintez prosesi çox mühümdür və bu zaman..." (too long)
`
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate unique question #${questionNumber} that is completely different from all existing questions. Follow DİM standards. Return the response as a valid JSON object.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI response empty');
      }

      const question = JSON.parse(content);

      // Check if generated question is duplicate
      if (this.isDuplicateQuestion(question.content, existingQuestions)) {
        throw new Error('Generated question is too similar to existing ones');
      }

      // Validate the generated question
      if (type === 'MULTIPLE_CHOICE') {
        if (!question.options || question.options.length !== 4) {
          throw new Error('Invalid multiple choice question format');
        }
        // Check for placeholder text
        const hasPlaceholders = question.options.some((opt: any) =>
          opt.content.toLowerCase().includes('variant'),
        );
        if (hasPlaceholders) {
          throw new Error('Question contains placeholder options');
        }
      }

      if (type === 'OPEN_ENDED') {
        if (!question.modelAnswer) {
          throw new Error('Missing modelAnswer for open-ended question');
        }
        // Ensure answer is concise
        const sentences = question.modelAnswer
          .split('.')
          .filter((s: string) => s.trim());
        if (sentences.length > 2) {
          question.modelAnswer = sentences.slice(0, 2).join('.') + '.';
        }
      }

      return question;
    } catch (error) {
      console.error('Error generating single question:', error);
      throw new Error(`Əlavə sual yaratmaq mümkün olmadı: ${error.message}`);
    }
  }

  async regenerateQuestion(
    examId: string,
    questionId: string,
    currentQuestion: any,
    prompt?: string,
  ) {
    const systemPrompt = `You are an expert exam question creator following DİM (Dövlət İmtahan Mərkəzi) standards.
You must return your response as a valid JSON object.

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
3. Follow DİM format standards
4. If MULTIPLE_CHOICE: include exactly 4 meaningful options and correctAnswer
5. If OPEN_ENDED: include CONCISE modelAnswer (1-2 sentences only)
6. Improve the question based on user feedback if provided
7. Make the question unique and different from the original

OUTPUT FORMAT - STRICT JSON:
{
"type": "${currentQuestion.type}",
"content": "improved question in Azerbaijani",
"points": ${currentQuestion.points || 1},
${currentQuestion.type === 'MULTIPLE_CHOICE' ? '"options": [{"content": "meaningful option A"}, {"content": "meaningful option B"}, {"content": "meaningful option C"}, {"content": "meaningful option D"}],' : ''}
${currentQuestion.type === 'MULTIPLE_CHOICE' ? '"correctAnswer": "0",' : ''}
${currentQuestion.type === 'OPEN_ENDED' ? '"modelAnswer": "concise direct answer (1-2 sentences max)"' : ''}
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content:
              prompt ||
              'Regenerate this question with improvements following DİM standards. Return the response as a valid JSON object.',
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
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

      // Ensure open-ended answers are concise
      if (result.type === 'OPEN_ENDED' && result.modelAnswer) {
        const sentences = result.modelAnswer
          .split('.')
          .filter((s: string) => s.trim());
        if (sentences.length > 2) {
          result.modelAnswer = sentences.slice(0, 2).join('.') + '.';
        }
      }

      return result;
    } catch (error) {
      console.error('Question regeneration error:', error);
      throw new Error('Sual yenidən yaradıla bilmədi: ' + error.message);
    }
  }
}
