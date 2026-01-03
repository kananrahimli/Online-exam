/**
 * Application routes
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  EXAMS: '/exams',
  MY_EXAMS: '/my-exams',
  RESULTS: '/results',
  ANALYTICS: '/analytics',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_CODE: '/verify-code',
  RESET_PASSWORD: '/reset-password',
  EXAM_RESULT: (attemptId: string) => `/exam-attempts/${attemptId}/result`,
  EXAM_DETAILS: (examId: string) => `/exams/${examId}`,
  EXAM_TAKE: (examId: string) => `/exams/${examId}/take`,
  EXAM_EDIT: (examId: string) => `/exams/${examId}/edit`,
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    PROFILE: '/auth/profile',
    BALANCE: '/auth/balance',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_CODE: '/auth/verify-code',
    RESET_PASSWORD: '/auth/reset-password',
    TEACHERS: '/auth/teachers',
  },
  EXAMS: {
    LIST: '/exams',
    PUBLISHED: '/exams/published',
    SUBJECTS: '/exams/subjects',
    MY_EXAMS: '/exams/my-exams',
    DETAIL: (id: string) => `/exams/${id}`,
    UPDATE: (id: string) => `/exams/${id}`,
    DELETE: (id: string) => `/exams/${id}`,
    PUBLISH: (id: string) => `/exams/${id}/publish`,
    LEADERBOARD: (id: string) => `/exams/${id}/leaderboard`,
  },
  EXAM_ATTEMPTS: {
    START: (examId: string) => `/exam-attempts/${examId}/start`,
    MY_ATTEMPTS: '/exam-attempts/my-attempts',
    DETAIL: (attemptId: string) => `/exam-attempts/${attemptId}`,
    UPDATE_ANSWERS: (attemptId: string) => `/exam-attempts/${attemptId}/answers`,
    SUBMIT: (attemptId: string) => `/exam-attempts/${attemptId}/submit`,
    RESULT: (attemptId: string) => `/exam-attempts/${attemptId}/result`,
    GRADE_ANSWER: (attemptId: string, answerId: string) =>
      `/exam-attempts/${attemptId}/answers/${answerId}/grade`,
  },
  ANALYTICS: {
    SUMMARY: '/analytics/summary',
    EXAM_STATS: (examId: string) => `/analytics/exam/${examId}`,
  },
  AI: {
    GENERATE_EXAM: '/ai/generate-exam',
    REGENERATE_QUESTION: '/ai/regenerate-question',
  },
  TEACHER_STUDENT: {
    FOLLOW: (teacherId: string) => `/teacher-student/${teacherId}/follow`,
    UNFOLLOW: (teacherId: string) => `/teacher-student/${teacherId}/unfollow`,
    MY_TEACHERS: '/teacher-student/my-teachers',
    MY_STUDENTS: '/teacher-student/my-students',
    TEACHERS: '/teacher-student/teachers',
  },
  PAYMENTS: {
    CREATE: '/payments',
    ADD_BALANCE: '/payments/add-balance',
    VERIFY: (paymentId: string) => `/payments/verify/${paymentId}`,
    SUCCESS: (paymentId: string) => `/payments/success/${paymentId}`,
    CANCEL: (paymentId: string) => `/payments/cancel/${paymentId}`,
  },
} as const;

