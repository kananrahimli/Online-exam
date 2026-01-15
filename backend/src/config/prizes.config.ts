// src/config/prizes.config.ts

export const PRIZE_CONFIG = {
  amounts: [10, 7, 3], // 1st, 2nd, 3rd prize amounts in AZN
  awardsDelayMinutes: 10, // Wait time before awarding prizes
  examPrices: {
    60: 3, // 1 hour = 3 AZN
    120: 5, // 2 hours = 5 AZN
    180: 10, // 3 hours = 10 AZN
  },
  defaultExamPrice: 3,
  teacherSplitPercentage: 50, // 50% to teacher
  adminSplitPercentage: 50, // 50% to admin
} as const;

export const EXAM_CONFIG = {
  openEndedSimilarityThreshold: 0.6, // 60% similarity required
  minWordLengthForMatching: 2, // Ignore words shorter than this
} as const;

export const PAYMENT_CONFIG = {
  transactionIdPrefixes: {
    EXAM: 'EXAM-',
    BALANCE: 'BAL-',
    BALANCE_DEDUCTION: 'BAL-DED-',
    PRIZE: 'PRIZE-',
  },
  payriffStatuses: {
    APPROVED: 'APPROVED',
    PAID: 'PAID',
    COMPLETED: 'COMPLETED',
  },
  withdrawalStatuses: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
} as const;
