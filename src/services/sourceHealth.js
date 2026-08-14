export function evaluateSourceHealth(source, now=new Date()) {
  if(source.status==='unsupported_connection') return {status:'unsupported_connection',healthy:false,reason:'החיבור אינו נתמך'};
  if(source.status==='fallback_required') return {status:'fallback_required',healthy:false,reason:'נדרש ייבוא חלופי'};
  if(source.status==='permission_expired') return {status:'permission_expired',healthy:false,reason:'ההרשאה פגה'};
  if(source.status==='failed'||source.consecutiveFailures>=3) return {status:'failed',healthy:false,reason:'סנכרון נכשל'};
  if(!source.lastSuccess) return {status:source.status||'waiting_connection',healthy:false,reason:'אין סנכרון מוצלח'};
  const ageHours=(now-new Date(source.lastSuccess))/3600000;
  if(source.freshnessHours&&ageHours>source.freshnessHours) return {status:'stale',healthy:false,reason:'לא עודכן לאחרונה',ageHours};
  return {status:'synced',healthy:true,reason:'מקור מעודכן',ageHours};
}

export function healthIssueFor(source,now=new Date()) {
  const health=evaluateSourceHealth(source,now);
  if(health.healthy||['waiting_connection','manual'].includes(health.status)) return null;
  return {type:'stale_source',severity:'high',title:`מקור מידע: ${health.reason}`,description:source.name,sourceId:source.id,status:'open',dedupeKey:`source-health:${source.id}:${health.status}`};
}
