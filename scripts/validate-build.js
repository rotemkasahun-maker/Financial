import { readFile, access } from 'node:fs/promises';
const files=['index.html','styles.css','src/app.js','src/services/dataService.js','src/services/finance.js','src/services/receiptExtraction.js','src/services/importPipeline.js','ARCHITECTURE.md'];
await Promise.all(files.map(access));
const html=await readFile('index.html','utf8'), app=await readFile('src/app.js','utf8');
if(!html.includes('dir="rtl"')) throw new Error('RTL is missing');
for(const label of ['דשבורד','עסקאות','קבלות','סופר ומוצרים','הוצאות קבועות','החזרים','תובנות','הגדרות']) if(!app.includes(label)) throw new Error(`Missing screen: ${label}`);
console.log(`Build validation passed: ${files.length} core files, RTL and 8 screens.`);
