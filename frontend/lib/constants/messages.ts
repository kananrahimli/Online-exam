/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  REQUIRED: 'Bu sahə mütləqdir',
  INVALID_EMAIL: 'Düzgün email ünvanı daxil edin',
  INVALID_PHONE: 'Düzgün telefon nömrəsi daxil edin (məs: +994501234567)',
  PASSWORD_MIN_LENGTH: 'Şifrə minimum 6 simvoldan ibarət olmalıdır',
  NAME_MIN_LENGTH: 'Ad minimum 2 simvoldan ibarət olmalıdır',
  CODE_LENGTH: 'Kod 6 rəqəmdən ibarət olmalıdır',
  CODE_NUMERIC: 'Kod yalnız rəqəmlərdən ibarət olmalıdır',
  GENERIC: 'Xəta baş verdi',
  UNAUTHORIZED: 'Giriş icazəsi verilmədi',
  NOT_FOUND: 'Məlumat tapılmadı',
  NETWORK_ERROR: 'Şəbəkə xətası',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  LOGIN: 'Uğurla giriş edildi',
  REGISTER: 'Qeydiyyat uğurla tamamlandı',
  UPDATE: 'Məlumatlar uğurla yeniləndi',
  DELETE: 'Uğurla silindi',
  CREATE: 'Uğurla yaradıldı',
  SUBMIT: 'Uğurla təqdim edildi',
} as const;

/**
 * Validation messages
 */
export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: 'Email ünvanı daxil edin',
  PASSWORD_REQUIRED: 'Şifrə daxil edin',
  FIRST_NAME_REQUIRED: 'Ad daxil edin',
  LAST_NAME_REQUIRED: 'Soyad daxil edin',
  TITLE_REQUIRED: 'Başlıq daxil edin',
  SUBJECT_REQUIRED: 'Fənn seçin',
  LEVEL_REQUIRED: 'Sinif seçin',
  DURATION_REQUIRED: 'Müddət daxil edin',
  DURATION_MIN: 'Müddət minimum 1 dəqiqə olmalıdır',
  QUESTIONS_REQUIRED: 'Ən azı bir sual əlavə edin',
} as const;

