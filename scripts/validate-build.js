import { readFile, access } from 'node:fs/promises';
const files=['index.html','styles.css','src/app.js','src/services/dataService.js','src/services/finance.js','src/services/receiptExtraction.js','src/services/importPipeline.js','src/services/completeness.js','src/services/sourceAdapters.js','src/services/sourceHealth.js','src/services/reconciliation.js','src/services/classification.js','src/data/ingestionMockData.js','ARCHITECTURE.md','AUTOMATION_MAP.md'];
await Promise.all(files.map(file=>access(file)));
const html=await readFile('index.html','utf8'), app=await readFile('src/app.js','utf8');
if(!html.includes('dir="rtl"')) throw new Error('RTL is missing');
const screens=['דשבורד','עסקאות','קבלות','סופר ומוצרים','הוצאות קבועות','החזרים','מקורות מידע','דורש טיפול','תובנות','הגדרות'];
for(const label of screens) if(!app.includes(label)) throw new Error(`Missing screen: ${label}`);
console.log(`Build validation passed: ${files.length} core files, RTL and ${screens.length} screens.`);
