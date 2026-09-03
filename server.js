import { createServer } from 'node:http';
import { readFile, stat, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { tmpdir, networkInterfaces } from 'node:os';
const root=process.cwd(), port=Number(process.env.PORT||4173), configuredHost=process.env.HOST?.trim();
const privateIPv4=Object.values(networkInterfaces()).flat().find(address=>address?.family==='IPv4'&&!address.internal&&(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address)))?.address;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};
const classificationRulesPath=process.env.CLASSIFICATION_RULES_PATH||join(root,'private-data','classification-rules.json');

async function serveClassificationRules(res){let rules=[];try{const parsed=JSON.parse(await readFile(classificationRulesPath,'utf8'));rules=Array.isArray(parsed)?parsed:Array.isArray(parsed.rules)?parsed.rules:[]}catch(error){if(error.code!=='ENOENT')throw error}res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({rules:rules.filter(rule=>rule?.confidence==='high'&&rule.userApproved&&rule.origin==='historical_bootstrap')}))}

async function parseXlsx(req,res){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>15*1024*1024)throw new Error('File too large');chunks.push(chunk)}const dir=await mkdtemp(join(tmpdir(),'family-finance-xlsx-'));const path=join(dir,'upload.xlsx');try{await writeFile(path,Buffer.concat(chunks));const {FileBlob,SpreadsheetFile}=await import('@oai/artifact-tool');const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(path));const sheet=workbook.worksheets.getItemAt(0),used=sheet.getUsedRange();res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({sheetName:sheet.name,rows:used?.values||[]}))}finally{await rm(dir,{recursive:true,force:true})}}

const handleRequest=async(req,res)=>{try{const raw=decodeURIComponent(req.url.split('?')[0]);if(req.method==='POST'&&raw==='/api/parse-xlsx'){await parseXlsx(req,res);return}if(req.method==='GET'&&raw==='/api/classification-rules'){await serveClassificationRules(res);return}const rel=raw==='/'?'index.html':raw.replace(/^\/+/, '');const path=normalize(join(root,rel));if(!path.startsWith(root))throw new Error('invalid path');const info=await stat(path);if(!info.isFile())throw new Error('not found');res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));}catch(error){res.writeHead(400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:error.message||'Request failed'}))}};
const listenHosts=configuredHost?[configuredHost]:(process.env.NODE_ENV==='production'?['0.0.0.0']:['127.0.0.1',privateIPv4]);
for(const address of listenHosts.filter(Boolean))createServer(handleRequest).listen(port,address,()=>console.log(`Family Finance: http://${address}:${port}`));
