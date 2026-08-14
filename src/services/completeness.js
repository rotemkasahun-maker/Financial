export function calculateCompleteness({month,sources,expectedDocuments,issues}) {
  const requiredSources=sources.filter(s=>['bank_import','credit_card_import','recurring_document'].includes(s.type));
  const sourceChecks=requiredSources.map(s=>({id:s.id,label:s.name,complete:['up_to_date','connected','synced','active'].includes(s.status),state:s.status}));
  const documentChecks=expectedDocuments.filter(d=>d.period===month).map(d=>({id:d.id,label:`${d.documentType} — ${month}`,complete:d.received,state:d.received?'received':'missing'}));
  const openIssues=issues.filter(i=>i.status==='open');
  const checks=[...sourceChecks,...documentChecks,{id:'unresolved',label:'אין חריגות פתוחות',complete:openIssues.length===0,state:openIssues.length?'needs_attention':'complete'}];
  const completed=checks.filter(c=>c.complete).length;
  return {month,checks,completed,total:checks.length,percent:Math.round(completed/Math.max(checks.length,1)*100),openIssues:openIssues.length,status:completed===checks.length?'complete':completed>=checks.length-1?'attention':'incomplete'};
}
