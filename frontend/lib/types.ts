export enum UserRole {
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
  ADMIN = "ADMIN",
}

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  OPEN_ENDED = "OPEN_ENDED",
  READING_COMPREHENSION = "READING_COMPREHENSION",
}

export enum ExamStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum ExamAttemptStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  TIMED_OUT = "TIMED_OUT",
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  balance?: number;
  teacherBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  subject: string;
  level: string;
  status: ExamStatus;
  price: number;
  duration: number;
  version: number;
  teacherId: string;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  topics?: ExamTopic[];
  questions?: Question[];
  readingTexts?: ReadingText[];
}

export interface ReadingText {
  id: string;
  examId: string;
  content: string;
  order: number;
}

export interface ExamTopic {
  id: string;
  examId: string;
  name: string;
  order: number;
  questions?: Question[];
}

export interface Question {
  id: string;
  examId: string;
  topicId?: string;
  readingTextId?: string;
  type: QuestionType;
  content: string;
  order: number;
  points: number;
  correctAnswer?: string;
  modelAnswer?: string;
  options?: Option[];
  readingText?: ReadingText;
}

export interface Option {
  id: string;
  questionId: string;
  content: string;
  order: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  status: ExamAttemptStatus;
  score?: number;
  totalScore?: number;
  startedAt: string;
  submittedAt?: string;
  expiresAt: string;
  answers?: Answer[];
}

export interface Answer {
  id: string;
  attemptId: string;
  questionId: string;
  optionId?: string;
  content?: string;
  isCorrect?: boolean;
  points?: number;
}

export interface Payment {
  id: string;
  studentId: string;
  examId: string;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}
