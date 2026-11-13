import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRemainingDays } from '../src/i18n/translations.ts';

test('formatRemainingDays formats positive remaining days in Arabic and English', () => {
  assert.equal(formatRemainingDays(1, 'closing_soon', 'ar'), 'بقي يوم واحد');
  assert.equal(formatRemainingDays(2, 'closing_soon', 'ar'), 'بقي يومان');
  assert.equal(formatRemainingDays(5, 'closing_soon', 'ar'), 'بقيت 5 أيام');
  assert.equal(formatRemainingDays(10, 'closing_soon', 'ar'), 'بقيت 10 أيام');
  assert.equal(formatRemainingDays(11, 'closing_soon', 'ar'), 'بقي 11 يوماً');
  assert.equal(formatRemainingDays(30, 'open', 'ar'), 'بقي 30 يوماً');

  assert.equal(formatRemainingDays(1, 'closing_soon', 'en'), '1 day left');
  assert.equal(formatRemainingDays(2, 'closing_soon', 'en'), '2 days left');
  assert.equal(formatRemainingDays(15, 'open', 'en'), '15 days left');
});

test('formatRemainingDays formats zero (last day) in Arabic and English', () => {
  assert.equal(formatRemainingDays(0, 'closing_soon', 'ar'), 'ينتهي اليوم');
  assert.equal(formatRemainingDays(0, 'closing_soon', 'en'), 'Closes today');
});

test('formatRemainingDays formats negative (expired) days in Arabic and English', () => {
  assert.equal(formatRemainingDays(-1, 'expired', 'ar'), 'انتهى منذ يوم واحد');
  assert.equal(formatRemainingDays(-2, 'expired', 'ar'), 'انتهى منذ يومين');
  assert.equal(formatRemainingDays(-3, 'expired', 'ar'), 'انتهى منذ 3 أيام');
  assert.equal(formatRemainingDays(-10, 'expired', 'ar'), 'انتهى منذ 10 أيام');
  assert.equal(formatRemainingDays(-11, 'expired', 'ar'), 'انتهى منذ 11 يوماً');

  assert.equal(formatRemainingDays(-1, 'expired', 'en'), 'Expired 1 day ago');
  assert.equal(formatRemainingDays(-4, 'expired', 'en'), 'Expired 4 days ago');
});

test('formatRemainingDays formats rolling and unspecified deadlines', () => {
  assert.equal(
    formatRemainingDays(null, 'open', 'ar'),
    'التقديم مفتوح (مستمر)',
  );
  assert.equal(
    formatRemainingDays(null, 'open', 'en'),
    'Rolling admission (Open)',
  );

  assert.equal(
    formatRemainingDays(null, 'unspecified', 'ar'),
    'الموعد غير محدد في المصدر',
  );
  assert.equal(
    formatRemainingDays(null, 'unspecified', 'en'),
    'Deadline not specified',
  );
});

