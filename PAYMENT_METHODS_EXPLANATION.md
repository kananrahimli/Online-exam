# Payment Service Metodları - Ətraflı İzahat

## 🔀 İki SplitPayment Metodunun Fərqləri

### 1. `splitPayment()` - PayRiff Payment-lər Üçün

**Yer**: `payment.service.ts:279-318`

**İstifadə olunur**:
- PayRiff ilə ödəniş tamamlandıqda (`verifyPayment()`, `handleCallback()`)
- Normal exam payment-lər üçün (PayRiff vasitəsilə)

**Xüsusiyyətlər**:
```typescript
private async splitPayment(
  paymentId: string,
  amount: number,
  teacherId: string,
)
```

- ❌ **Transaction dəstəyi YOXDUR** - `prisma` birbaşa istifadə edir
- ✅ **Hardcoded 50/50 split**: `amount / 2` (hər ikisi üçün)
- ✅ **Standalone işləyir** - transaction xaricində çağırılır
- ✅ **PayRiff flow** üçün nəzərdə tutulub

**Nümunə**:
```typescript
// PayRiff ödənişi tamamlandıqda
await this.splitPayment(paymentId, 10, teacherId);
// Teacher: 5 AZN, Admin: 5 AZN
```

---

### 2. `splitPaymentForExam()` - Balance-dan Çıxılma Üçün

**Yer**: `payment.service.ts:1023-1062`

**İstifadə olunur**:
- `deductExamPayment()` metodunda
- Tələbə balansından imtahan üçün pul çıxıldıqda

**Xüsusiyyətlər**:
```typescript
private async splitPaymentForExam(
  tx: any,              // ⭐ Transaction object
  paymentId: string,
  amount: number,
  teacherId: string,
)
```

- ✅ **Transaction dəstəyi VAR** - `tx` parametri ilə
- ✅ **PRIZE_CONFIG istifadə edir**: 
  - `PRIZE_CONFIG.teacherSplitPercentage` (50%)
  - `PRIZE_CONFIG.adminSplitPercentage` (50%)
- ✅ **Atomic operation** - transaction daxilində işləyir
- ✅ **Balance deduction flow** üçün nəzərdə tutulub

**Nümunə**:
```typescript
// Balance-dan çıxılma zamanı
await this.prisma.$transaction(async (tx) => {
  // Balance çıxılır
  await tx.user.update({...});
  
  // Payment yaradılır
  const payment = await tx.payment.create({...});
  
  // Split edilir (transaction daxilində)
  await this.splitPaymentForExam(tx, payment.id, 10, teacherId);
  // Teacher: 5 AZN, Admin: 5 AZN (PRIZE_CONFIG-dən)
});
```

---

## 📊 Fərqlərin Cədvəli

| Xüsusiyyət | `splitPayment()` | `splitPaymentForExam()` |
|------------|------------------|------------------------|
| **Transaction dəstəyi** | ❌ Yox | ✅ Var (`tx` parametri) |
| **Split məntiqi** | Hardcoded `amount / 2` | `PRIZE_CONFIG` istifadə edir |
| **İstifadə yeri** | PayRiff payment-lər | Balance deduction |
| **Atomicity** | ❌ Yox | ✅ Var (transaction daxilində) |
| **Config flexibility** | ❌ Hardcoded | ✅ Config-dən gəlir |
| **Error handling** | Standalone | Transaction rollback ilə |

---

## 🆕 Yeni Əlavə Olunan Metodlar

### 1. `calculateExamPrice(duration: number)`

**Yer**: `payment.service.ts:904-906`

**Məqsəd**: İmtahan müddətinə görə qiymət hesablama

**Nə edir**:
```typescript
calculateExamPrice(60)   // → 3 AZN
calculateExamPrice(120)  // → 5 AZN
calculateExamPrice(180)  // → 10 AZN
calculateExamPrice(90)   // → 3 AZN (default)
```

**İstifadə yeri**:
- `exam-attempt.service.ts` - `startExam()` metodunda
- İmtahan başlanmazdan əvvəl qiymət hesablanır

**Config mənbəsi**: `PRIZE_CONFIG.examPrices`

---

### 2. `deductExamPayment(...)`

**Yer**: `payment.service.ts:911-948`

**Məqsəd**: Tələbə balansından imtahan üçün pul çıxılma

**Parametrlər**:
```typescript
async deductExamPayment(
  studentId: string,    // Tələbə ID
  examId: string,       // İmtahan ID
  attemptId: string,    // İmtahan cəhdi ID
  examPrice: number,    // İmtahan qiyməti
  teacherId: string,    // Müəllim ID (split üçün)
)
```

**Nə edir**:
1. ✅ **Transaction başlayır** (atomicity üçün)
2. ✅ **Balansdan çıxır**: `user.balance -= examPrice`
3. ✅ **Payment record yaradır**: `PaymentStatus.COMPLETED`
4. ✅ **Split edir**: `splitPaymentForExam()` çağırır
   - Teacher balansına əlavə edir
   - Admin-ə pay verir
5. ✅ **Transaction commit edir**

**İstifadə yeri**:
- `exam-attempt.service.ts` - `startExam()` metodunda
- Tələbə imtahana başlayanda balansdan pul çıxılır

**Nümunə**:
```typescript
// Tələbə imtahana başlayanda
await paymentService.deductExamPayment(
  studentId,
  examId,
  attemptId,
  5, // 120 dəqiqə = 5 AZN
  teacherId
);
// Balansdan 5 AZN çıxılır
// Teacher: +2.5 AZN, Admin: +2.5 AZN
```

---

### 3. `awardPrize(studentId, examId, amount, position)`

**Yer**: `payment.service.ts:953-1018`

**Məqsəd**: İmtahanda yaxşı nəticə göstərən tələbəyə mükafat vermə

**Parametrlər**:
```typescript
async awardPrize(
  studentId: string,    // Tələbə ID
  examId: string,       // İmtahan ID
  amount: number,      // Mükafat məbləği (10, 7, 3 AZN)
  position: number,    // Yer (1, 2, 3)
)
```

**Nə edir**:
1. ✅ **Unique transaction ID yaradır**: 
   ```
   PRIZE-{position}-{examId}-{studentId}-{timestamp}
   ```
2. ✅ **Transaction başlayır**
3. ✅ **Balansı artırır**: `user.balance += amount`
4. ✅ **Payment record yaradır**: 
   - `transactionId` ilə prize məlumatı
   - `PaymentStatus.COMPLETED`
5. ✅ **Error handling**:
   - Duplicate key error (P2002) handle edir
   - Race condition qarşısının alınması
   - Unique constraint violation

**İstifadə yeri**:
- `prize-award.service.ts` - `awardPrizesForExam()` metodunda
- Top 3 tələbəyə mükafat veriləndə

**Nümunə**:
```typescript
// 1-ci yer üçün
await paymentService.awardPrize(
  studentId,
  examId,
  10, // 1-ci yer mükafatı
  1   // Position
);
// Tələbə balansına +10 AZN əlavə olunur
// Payment record: transactionId = "PRIZE-1-examId-studentId-timestamp"
```

**Error Handling**:
```typescript
// Duplicate prize award qarşısının alınması
if (error.code === 'P2002') {
  if (target?.includes('unique_prize_payment')) {
    // Artıq mükafat verilib, skip et
    return;
  }
}
```

---

### 4. `getExistingPrizes(studentIds, examIds)`

**Yer**: `payment.service.ts:1067-1095`

**Məqsəd**: Mövcud mükafatları batch query ilə alma (performance üçün)

**Parametrlər**:
```typescript
async getExistingPrizes(
  studentIds: string[],  // Tələbə ID-ləri array
  examIds: string[],     // İmtahan ID-ləri array
)
```

**Qaytarır**:
```typescript
Map<string, Set<string>>
// Key: examId
// Value: Set of studentIds who received prizes
```

**Nə edir**:
1. ✅ **Batch query**: Bütün prize payment-ləri bir query-də alır
2. ✅ **Filter**: `transactionId` `PRIZE-` ilə başlayanları
3. ✅ **Map yaradır**: examId → studentIds Set
4. ✅ **Performance**: N+1 query problemi aradan qaldırır

**İstifadə yeri**:
- `prize-award.service.ts` - `awardPrizesForExam()` metodunda
- Mükafat verilməzdən əvvəl yoxlamaq üçün

**Nümunə**:
```typescript
const existingPrizes = await paymentService.getExistingPrizes(
  ['student1', 'student2'],
  ['exam1', 'exam2']
);

// Nəticə:
// Map {
//   'exam1' => Set { 'student1' },
//   'exam2' => Set { 'student1', 'student2' }
// }

// Yoxlama:
if (existingPrizes.get('exam1')?.has('student1')) {
  // student1 artıq exam1 üçün mükafat alıb
}
```

**Performance faydası**:
```typescript
// ❌ Pis (N+1 query):
for (const studentId of studentIds) {
  const prize = await prisma.payment.findFirst({...}); // N query
}

// ✅ Yaxşı (1 query):
const prizes = await getExistingPrizes(studentIds, examIds); // 1 query
```

---

### 5. `countExamPrizes(examId)`

**Yer**: `payment.service.ts:1100-1112`

**Məqsəd**: İmtahan üçün verilmiş mükafatların sayını hesablama

**Parametrlər**:
```typescript
async countExamPrizes(
  examId: string  // İmtahan ID
)
```

**Qaytarır**: `number` - Mükafat sayı

**Nə edir**:
1. ✅ **Count query**: `transactionId` `PRIZE-` ilə başlayan payment-ləri sayır
2. ✅ **Sürətli**: Sadə count query

**İstifadə yeri**:
- `prize-award.service.ts` - `awardPrizesForExam()` metodunda
- Mükafatlar artıq verilibsə (3+ prize varsa) skip etmək üçün

**Nümunə**:
```typescript
const prizeCount = await paymentService.countExamPrizes('exam1');

if (prizeCount >= 3) {
  // Artıq 3 mükafat verilib, skip et
  return;
}

// Mükafat verməyə davam et
```

---

## 📋 Metodların İstifadə Sxemi

### Exam Start Flow:
```
startExam()
  ↓
calculateExamPrice() → 5 AZN
  ↓
deductExamPayment()
  ├─ Balance çıxılır: -5 AZN
  ├─ Payment record yaradılır
  └─ splitPaymentForExam()
     ├─ Teacher: +2.5 AZN
     └─ Admin: +2.5 AZN
```

### Prize Award Flow:
```
awardPrizesForExam()
  ↓
countExamPrizes() → 0 (hələ mükafat yoxdur)
  ↓
getExistingPrizes() → Map (mövcud mükafatlar)
  ↓
awardPrize() (top 3 tələbə üçün)
  ├─ Balance artırılır: +10 AZN
  ├─ Payment record yaradılır
  └─ Error handling (duplicate qarşısının alınması)
```

---

## 🎯 Ümumi Xülasə

### Split Metodları:
- **`splitPayment()`**: PayRiff ödənişləri üçün, standalone
- **`splitPaymentForExam()`**: Balance deduction üçün, transaction daxilində

### Yeni Metodlar:
1. **`calculateExamPrice()`** - Qiymət hesablama
2. **`deductExamPayment()`** - Balansdan çıxılma + split
3. **`awardPrize()`** - Mükafat vermə + error handling
4. **`getExistingPrizes()`** - Batch query (performance)
5. **`countExamPrizes()`** - Mükafat sayı

### Əsas Fərqlər:
- **Transaction dəstəyi**: `splitPaymentForExam()` transaction istifadə edir
- **Config**: `splitPaymentForExam()` PRIZE_CONFIG istifadə edir
- **Atomicity**: `deductExamPayment()` və `awardPrize()` atomic operation-lərdir
- **Performance**: `getExistingPrizes()` N+1 problemi həll edir
