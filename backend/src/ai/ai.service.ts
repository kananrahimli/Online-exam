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

    let questionTypeDescription = '';
    if (hasMultipleChoice && hasOpenEnded && hasReading) {
      questionTypeDescription =
        'Qarışıq: Test sualları, açıq suallar və mətn əsaslı suallar';
    } else if (hasMultipleChoice && hasOpenEnded) {
      questionTypeDescription = 'Qarışıq: Test sualları və açıq suallar';
    } else if (hasMultipleChoice && hasReading) {
      questionTypeDescription = 'Qarışıq: Test sualları və mətn əsaslı suallar';
    } else if (hasOpenEnded && hasReading) {
      questionTypeDescription = 'Qarışıq: Açıq suallar və mətn əsaslı suallar';
    } else if (hasMultipleChoice) {
      questionTypeDescription = 'Yalnız test sualları (çox seçimli)';
    } else if (hasOpenEnded) {
      questionTypeDescription = 'Yalnız açıq suallar';
    } else if (hasReading) {
      questionTypeDescription = 'Yalnız mətn əsaslı suallar';
    }

    let readingInstructions = '';
    if (hasReading && readingText) {
      readingInstructions = `
      
MƏTN:
${readingText}

MƏTN ƏSASLI SUALLAR ÜÇÜN TƏLİMAT:
- Yuxarıdakı mətndən ${readingQuestionCount || 5} sual yaradılmalıdır
- Bu suallar mətnin məzmununa əsaslanmalıdır
- Mətn əsaslı suallar üçün type: "READING_COMPREHENSION" istifadə et
- Mətn əsaslı suallar test formatında ola bilər (options ilə) və ya açıq sual ola bilər
`;
    }

    const systemPrompt = `Sən məşhur bir müəllim və imtahan hazırlayıcısan. 
Məqsədin ${subject} fənnindən ${level} səviyyəsi üçün imtahan sualları hazırlamaqdır.
Mövzu: ${topic}
Ümumi sual sayı: ${questionCount}
Sual növləri: ${questionTypeDescription}
${readingInstructions}

QAYDALAR:
1. Suallar ${level} səviyyəsinə uyğun olmalıdır
2. Dəqiq və anlaşıqlı suallar hazırla
3. Test sualları (MULTIPLE_CHOICE) üçün həmişə 4 variant (A, B, C, D) olmalıdır
4. Düzgün cavabı işarələ (correctAnswer variantın indexidir: 0, 1, 2, və ya 3)
5. Açıq suallar (OPEN_ENDED) üçün options və correctAnswer olmamalıdır, amma modelAnswer MUTLAQ lazımdır
6. Açıq suallar üçün modelAnswer - ideal/nümunə cavab olmalıdır ki, şagird öz cavabını müqayisə edə bilsin
7. Mətn əsaslı suallar (READING_COMPREHENSION) mətnin məzmununa əsaslanmalıdır
8. Sual növlərini müvafiq şəkildə paylaş: ${hasMultipleChoice ? 'test sualları, ' : ''}${hasOpenEnded ? 'açıq suallar, ' : ''}${hasReading ? 'mətn əsaslı suallar' : ''}
9. JSON formatında qaytar

FORMAT:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE" | "OPEN_ENDED" | "READING_COMPREHENSION",
      "content": "sual mətni",
      "points": 1,
      "options": [
        { "content": "variant A" },
        { "content": "variant B" },
        { "content": "variant C" },
        { "content": "variant D" }
      ],
      "correctAnswer": "0",
      "modelAnswer": "nümunə cavab (yalnız OPEN_ENDED üçün lazımdır)"
    }
  ]
}

QEYDLƏR:
- correctAnswer yalnız MULTIPLE_CHOICE və READING_COMPREHENSION (test formatında) suallar üçün lazımdır
- OPEN_ENDED suallar üçün options və correctAnswer olmamalıdır, amma modelAnswer MUTLAQ lazımdır
- modelAnswer açıq suallar üçün düzgün, tam və ətraflı cavab olmalıdır
- A variantı = 0, B = 1, C = 2, D = 3
- Mətn əsaslı suallar üçün sual mətnin məzmununa əsaslanmalıdır
`;

    const userPrompt =
      readingText && hasReading ? `${systemPrompt}` : systemPrompt;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI-dan cavab alınmadı');
      }

      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error('İmtahan yaratmaq mümkün olmadı');
    }
  }

  async regenerateQuestion(
    examId: string,
    questionId: string,
    prompt?: string,
  ) {
    // Implementation for regenerating a single question
    // This would be similar to generateExam but for a single question
    void examId;
    void questionId;
    void prompt;
    return { message: 'Sualın yenidən yaradılması hələ tətbiq edilməyib' };
  }
}
