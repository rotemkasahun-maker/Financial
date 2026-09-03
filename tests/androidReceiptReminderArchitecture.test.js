import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('receipt grace uses separate one-time work and leaves periodic maintenance at twelve hours', () => {
  const periodic = read('../android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/maintenance/MaintenanceWorkScheduler.kt');
  const receipt = read('../android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/receipt/ReceiptReminderScheduler.kt');
  assert.match(periodic, /PeriodicWorkRequestBuilder<MaintenanceWorker>\(12, TimeUnit\.HOURS\)/);
  assert.match(periodic, /family-finance-shared-maintenance/);
  assert.match(receipt, /OneTimeWorkRequestBuilder<ReceiptReminderWorker>/);
  assert.match(receipt, /family-finance-receipt-grace-/);
  assert.doesNotMatch(receipt, /PeriodicWorkRequestBuilder/);
});

test('both SMS and financial notification collectors enqueue immediate evidence sync', () => {
  const sms = read('../android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/sms/SmsReceiver.kt');
  const notification = read('../android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/notification/FinancialNotificationListenerService.kt');
  assert.match(sms, /EvidenceSyncWorkScheduler\.schedule\(context, evidence\.externalSourceId\)/);
  assert.match(notification, /EvidenceSyncWorkScheduler\.schedule\(applicationContext, evidence\.externalSourceId\)/);
});
