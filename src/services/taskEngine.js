export const TaskStatus=Object.freeze({OPEN:'open',COMPLETED:'completed',SNOOZED:'snoozed',DISMISSED:'dismissed',NO_RECEIPT:'no_receipt_available'});

export function inferTaskOwner(transaction){return transaction.userId||transaction.sourceMetadata?.userId||(transaction.sourceAccount?.includes('1180')?'demo-member-b':transaction.sourceAccount?'demo-member-a':null);}

export function ensureMissingReceiptTask(transaction,tasks,{now=new Date(),waitingPeriodHours=24,rewardXP=20}={}){
  if(transaction.receiptId||transaction.financialType!=='expense')return {tasks,created:null};
  const key=`missing_receipt:${transaction.id}`;
  const existing=tasks.find(t=>t.dedupeKey===key);
  if(existing)return {tasks,created:null};
  const ageHours=(now-new Date(transaction.importedAt||`${transaction.date}T00:00:00Z`))/3600000;
  if(ageHours<waitingPeriodHours)return {tasks,created:null};
  const task={id:crypto.randomUUID(),dedupeKey:key,type:'missing_receipt',ownerId:inferTaskOwner(transaction),title:'חסרה קבלה',explanation:`${transaction.merchant} · ${transaction.amount} ₪`,relatedRecordType:'transaction',relatedRecordId:transaction.id,priority:'high',dueAt:now.toISOString(),status:TaskStatus.OPEN,xpReward:rewardXP,deepLink:{route:'receipt_capture',params:{transactionId:transaction.id}},notificationState:'first_due',notificationCount:0,createdAt:now.toISOString()};
  return {tasks:[...tasks,task],created:task};
}

export function completeTaskExactlyOnce({taskId,tasks,xpEvents,userScores,now=new Date()}){
  const task=tasks.find(t=>t.id===taskId);if(!task||task.status===TaskStatus.COMPLETED)return {tasks,xpEvents,userScores,xpEvent:null};
  const updatedTasks=tasks.map(t=>t.id===taskId?{...t,status:TaskStatus.COMPLETED,completedAt:now.toISOString(),notificationState:'completed',xpAwarded:true}:t);
  const key=`task:${taskId}`;if(xpEvents.some(e=>e.dedupeKey===key))return {tasks:updatedTasks,xpEvents,userScores,xpEvent:null};
  const xpEvent={id:crypto.randomUUID(),dedupeKey:key,userId:task.ownerId,taskId,amount:task.xpReward,reason:task.type==='missing_receipt'?'missing_receipt_completed':'task_completed',createdAt:now.toISOString()};
  const updatedScores=userScores.map(s=>s.userId===task.ownerId?{...s,xp:s.xp+task.xpReward}:s);
  return {tasks:updatedTasks,xpEvents:[...xpEvents,xpEvent],userScores:updatedScores,xpEvent};
}

export function completeReceiptTask(transactionId,state,options){const task=state.tasks.find(t=>t.type==='missing_receipt'&&t.relatedRecordId===transactionId&&t.status!==TaskStatus.COMPLETED);return task?completeTaskExactlyOnce({taskId:task.id,...state,...options}):{...state,xpEvent:null};}
export function remindersFor(tasks,rule,now=new Date()){return tasks.filter(t=>t.type===rule.taskType&&t.status===TaskStatus.OPEN&&t.notificationState!=='completed'&&(t.notificationCount||0)<rule.maxNotifications&&new Date(t.dueAt)<=now);}
export function challengeProgress(challenge,tasks,completenessPercent=0){const current=challenge.type==='data_completeness'?completenessPercent:tasks.filter(t=>t.type===challenge.taskType&&t.status===TaskStatus.COMPLETED&&(!challenge.startDate||t.completedAt?.slice(0,10)>=challenge.startDate)&&(!challenge.endDate||t.completedAt?.slice(0,10)<=challenge.endDate)).length;return {...challenge,current,percent:Math.min(100,Math.round(current/challenge.target*100)),status:current>=challenge.target?'completed':challenge.status};}
