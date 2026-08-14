export const importSources = [
  {id:'src-gmail-a',name:'Gmail — משתמשת א׳',type:'gmail',owner:'משתמשת א׳',method:'OAuth עתידי',mode:'automatic',status:'waiting_connection',lastAttempt:null,lastSuccess:null,nextSync:null,freshnessHours:24,consecutiveFailures:0,pendingIssues:0},
  {id:'src-gmail-b',name:'Gmail — משתמש ב׳',type:'gmail',owner:'משתמש ב׳',method:'OAuth עתידי',mode:'automatic',status:'waiting_connection',lastSuccess:null,nextExpected:null,pendingIssues:0},
  {id:'src-sms-a',name:'Android SMS — משתמשת א׳',type:'android_sms',owner:'משתמשת א׳',method:'סינון מקומי בטלפון',mode:'automatic',status:'waiting_connection',lastSuccess:null,nextExpected:null,pendingIssues:0},
  {id:'src-sms-b',name:'Android SMS — משתמש ב׳',type:'android_sms',owner:'משתמש ב׳',method:'סינון מקומי בטלפון',mode:'automatic',status:'waiting_connection',lastSuccess:null,nextExpected:null,pendingIssues:0},
  {id:'src-bank',name:'חשבון בנק',type:'bank_import',owner:'משק הבית',method:'FileAdapter · OpenBankingAdapter מוכן',mode:'semi_automatic',status:'synced',lastAttempt:'2026-08-13T08:14:00Z',lastSuccess:'2026-08-13T08:15:00Z',nextSync:'2026-08-15T06:00:00Z',nextExpected:'2026-09-01',freshnessHours:48,consecutiveFailures:0,pendingIssues:0},
  {id:'src-card',name:'כרטיס אשראי',type:'credit_card_import',owner:'משק הבית',method:'FileAdapter · OpenBankingAdapter מוכן',mode:'semi_automatic',status:'needs_attention',lastAttempt:'2026-08-10T07:29:00Z',lastSuccess:'2026-08-10T07:30:00Z',nextSync:'2026-08-15T06:00:00Z',nextExpected:'2026-08-15',freshnessHours:48,consecutiveFailures:1,pendingIssues:1},
  {id:'src-camera',name:'צילום והעלאת קבלות',type:'camera_capture',owner:'שני המשתמשים',method:'מצלמה / תמונה / PDF',mode:'semi_automatic',status:'connected',lastSuccess:'2026-08-12T16:42:00Z',nextExpected:null,pendingIssues:1},
  {id:'src-benefit',name:'מסמכים חודשיים',type:'recurring_document',owner:'משתמשת א׳',method:'העלאה ידנית עם תזכורת',mode:'manual_reminder',status:'missing_data',lastSuccess:'2026-07-09T10:00:00Z',nextExpected:'2026-08-10',pendingIssues:1}
];

export const expectedDocuments = [
  {id:'doc-benefit-2026-08',documentType:'תלוש תגמולים',frequency:'monthly',period:'2026-08',expectedDate:'2026-08-10',owner:'משתמשת א׳',received:false,fileId:null,extractedData:null,reminderState:'due',sourceId:'src-benefit'},
  {id:'doc-benefit-2026-07',documentType:'תלוש תגמולים',frequency:'monthly',period:'2026-07',expectedDate:'2026-07-10',owner:'משתמשת א׳',received:true,fileId:'demo-file-july',extractedData:{amount:2840,currency:'ILS'},reminderState:'completed',sourceId:'src-benefit'},
  {id:'doc-card-2026-08',documentType:'פירוט כרטיס אשראי',frequency:'monthly',period:'2026-08',expectedDate:'2026-08-15',owner:'משק הבית',received:false,fileId:null,extractedData:null,reminderState:'upcoming',sourceId:'src-card'}
];

export const importRuns = [
  {id:'run-1',sourceId:'src-bank',startedAt:'2026-08-13T08:14:00Z',completedAt:'2026-08-13T08:15:00Z',status:'success',recordsReceived:42,recordsSaved:40,duplicatesSkipped:2},
  {id:'run-2',sourceId:'src-card',startedAt:'2026-08-10T07:29:00Z',completedAt:'2026-08-10T07:30:00Z',status:'partial',recordsReceived:31,recordsSaved:30,duplicatesSkipped:0}
];

export const importIssues = [
  {id:'issue-1',type:'suspected_duplicate',severity:'warning',title:'קבלה חשודה ככפילות',description:'רמי לוי · 487.30 ₪ · 12.08.2026',sourceId:'src-camera',status:'open',createdAt:'2026-08-12T16:42:00Z',action:'בדיקת התאמה'},
  {id:'issue-2',type:'missing_document',severity:'high',title:'מסמך חודשי חסר',description:'תלוש תגמולים — אוגוסט 2026',sourceId:'src-benefit',expectedDocumentId:'doc-benefit-2026-08',status:'open',createdAt:'2026-08-11T06:00:00Z',action:'העלי עכשיו'},
  {id:'issue-3',type:'import_failed',severity:'high',title:'שורה אחת לא נקלטה',description:'קובץ כרטיס האשראי מכיל תאריך לא תקין',sourceId:'src-card',status:'open',createdAt:'2026-08-10T07:30:00Z',action:'בדיקת הייבוא'},
  {id:'issue-4',type:'uncategorized',severity:'warning',title:'עסקה ללא קטגוריה',description:'חיוב לא מזוהה · 74.90 ₪',sourceId:'src-card',status:'open',createdAt:'2026-08-10T07:30:00Z',action:'בחירת קטגוריה'},
  {id:'issue-5',type:'stale_source',severity:'high',title:'מקור לא הסתנכרן לאחרונה',description:'Android SMS — משתמש ב׳ · אין heartbeat מהמכשיר',sourceId:'src-sms-b',status:'open',createdAt:'2026-08-14T06:00:00Z',action:'בדיקת המכשיר'}
];

export const reminderTasks = [
  {id:'task-1',type:'expected_document',title:'העלאת תלוש תגמולים',period:'2026-08',dueDate:'2026-08-10',expectedDocumentId:'doc-benefit-2026-08',status:'due',notifyAndroidLater:true},
  {id:'task-2',type:'source_refresh',title:'העלאת פירוט כרטיס אשראי',period:'2026-08',dueDate:'2026-08-15',expectedDocumentId:'doc-card-2026-08',status:'upcoming',notifyAndroidLater:true}
];
