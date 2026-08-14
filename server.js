import { createServer } from 'node:http';
import { readFile, stat, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
const root=process.cwd(), port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};

async function parseXlsx(req,res){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>15*1024*1024)throw new Error('File too large');chunks.push(chunk)}const dir=await mkdtemp(join(tmpdir(),'family-finance-xlsx-'));const path=join(dir,'upload.xlsx');try{await writeFile(path,Buffer.concat(chunks));const {FileBlob,SpreadsheetFile}=await import('@oai/artifact-tool');const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(path));const sheet=workbook.worksheets.getItemAt(0),used=sheet.getUsedRange();res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({sheetName:sheet.name,rows:used?.values||[]}))}finally{await rm(dir,{recursive:true,force:true})}}

createServer(async(req,res)=>{try{const raw=decodeURIComponent(req.url.split('?')[0]);if(req.method==='POST'&&raw==='/api/parse-xlsx'){await parseXlsx(req,res);return}const rel=raw==='/'?'index.html':raw.replace(/^\/+/, '');const path=normalize(join(root,rel));if(!path.startsWith(root))throw new Error('invalid path');const info=await stat(path);if(!info.isFile())throw new Error('not found');res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));}catch(error){res.writeHead(400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:error.message||'Request failed'}))}}).listen(port,'127.0.0.1',()=>console.log(`Family Finance: http://127.0.0.1:${port}`));
