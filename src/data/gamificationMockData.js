export const rewardConfig={missing_receipt_completed:20,review_issue_resolved:10,expected_document_completed:15,receipt_before_reminder_bonus:5,weekly_receipt_streak:25};

export const userScores=[
  {userId:'demo-member-a',displayName:'רותם',xp:145,level:3,activeStreak:6},
  {userId:'demo-member-b',displayName:'שמואל',xp:120,level:3,activeStreak:4}
];

export const tasks=[
  {id:'task-receipt-t1',dedupeKey:'missing_receipt:t1',type:'missing_receipt',ownerId:'demo-member-a',title:'חסרה קבלה',explanation:'רמי לוי · 487.30 ₪',relatedRecordType:'transaction',relatedRecordId:'t1',priority:'high',dueAt:'2026-08-14T18:00:00Z',status:'open',xpReward:20,deepLink:{route:'receipt_capture',params:{transactionId:'t1'}},notificationState:'first_due',createdAt:'2026-08-14T08:00:00Z'},
  {id:'task-document-aug',dedupeKey:'expected_document:doc-benefit-2026-08',type:'expected_document',ownerId:'demo-member-a',title:'העלי תלוש תגמולים',explanation:'המסמך של אוגוסט עדיין חסר',relatedRecordType:'expected_document',relatedRecordId:'doc-benefit-2026-08',priority:'high',dueAt:'2026-08-14T19:00:00Z',status:'open',xpReward:15,deepLink:{route:'document_upload',params:{documentId:'doc-benefit-2026-08'}},notificationState:'first_due',createdAt:'2026-08-11T06:00:00Z'},
  {id:'task-category',dedupeKey:'issue:issue-4',type:'resolve_issue',ownerId:null,title:'סווגו עסקה אחת',explanation:'חיוב לא מזוהה · 74.90 ₪',relatedRecordType:'import_issue',relatedRecordId:'issue-4',priority:'normal',dueAt:'2026-08-16T18:00:00Z',status:'open',xpReward:10,deepLink:{route:'attention',params:{issueId:'issue-4'}},notificationState:'not_scheduled',createdAt:'2026-08-14T09:00:00Z'},
  {id:'task-done-demo',dedupeKey:'receipt:r2',type:'receipt_uploaded',ownerId:'demo-member-b',title:'קבלה הועלתה',explanation:'עזיזו לבנדר',relatedRecordType:'receipt',relatedRecordId:'r2',priority:'normal',dueAt:null,status:'completed',completedAt:'2026-08-14T10:20:00Z',xpReward:20,xpAwarded:true,deepLink:{route:'receipts',params:{receiptId:'r2'}},notificationState:'completed'}
];

export const xpEvents=[{id:'xp-demo-1',dedupeKey:'task:task-done-demo',userId:'demo-member-b',taskId:'task-done-demo',amount:20,reason:'missing_receipt_completed',createdAt:'2026-08-14T10:20:00Z'}];

export const challenges=[
  {id:'challenge-receipts-week',title:'שבוע בלי קבלות חסרות',type:'task_completion',taskType:'missing_receipt',target:5,current:3,startDate:'2026-08-10',endDate:'2026-08-16',participantIds:['demo-member-a','demo-member-b'],rewardXP:25,status:'active'},
  {id:'challenge-complete-month',title:'מגיעים ל־100% שלמות',type:'data_completeness',target:100,current:17,startDate:'2026-08-01',endDate:'2026-08-31',participantIds:['household'],rewardXP:40,status:'active'}
];

export const achievements=[
  {id:'receipt-king',title:'מלך הקבלות',description:'רצף של 7 קבלות',icon:'♛',threshold:7,type:'receipt_streak'},
  {id:'faster-than-credit',title:'מהיר מהאשראי',description:'קבלה לפני התזכורת',icon:'⚡',threshold:1,type:'receipt_before_reminder'},
  {id:'inbox-zero',title:'Inbox Zero',description:'אין פריטים שדורשים טיפול',icon:'✓',threshold:1,type:'zero_issues'},
  {id:'perfect-month',title:'חודש מושלם',description:'100% שלמות נתונים',icon:'★',threshold:100,type:'data_completeness'}
];

export const notificationRules=[
  {id:'rule-missing-receipt',taskType:'missing_receipt',waitingPeriodHours:24,firstReminderAfterHours:24,followUpAfterHours:48,maxNotifications:2,snoozeHours:24,channels:['in_app','android_future'],active:true},
  {id:'rule-expected-document',taskType:'expected_document',waitingPeriodHours:0,firstReminderAfterHours:0,followUpAfterHours:72,maxNotifications:2,snoozeHours:24,channels:['in_app','android_future'],active:true}
];
