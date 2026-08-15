import { generateId } from '../utils/id.js';

export const MADRID_TARGET_AMOUNT=15000;
export const MADRID_LEVELS=Object.freeze([
  {level:1,title:'מתחילים לארוז',minXP:0,icon:'🧳'},
  {level:2,title:'הדרכון מוכן',minXP:300,icon:'🛂'},
  {level:3,title:'בדרך לשדה',minXP:700,icon:'✈️'},
  {level:4,title:'נוחתים במדריד',minXP:1400,icon:'🇪🇸'},
  {level:5,title:'המשחק מחכה',minXP:2400,icon:'⚽'}
]);

export function createMadridGoal(data={}){return {id:'madrid-main-goal',title:'הדרך למדריד',targetAmount:MADRID_TARGET_AMOUNT,realSavedAmount:0,currency:'ILS',xp:0,level:1,isDemo:true,dataSource:'demo',contributions:[],participants:[],challenges:[],planningBreakdown:[{name:'טיסות',amount:3500},{name:'מלון',amount:4200},{name:'כרטיסים למשחק',amount:3000},{name:'אוכל ובילויים',amount:1800},{name:'תחבורה',amount:1000},{name:'מרווח ביטחון',amount:1500}],...data}}

export function madridProgress(goal,userScores=[]){
  const xp=Number(goal.xp||0)+userScores.reduce((sum,user)=>sum+Number(user.xp||0),0),saved=Math.max(0,Number(goal.realSavedAmount||0)),target=Math.max(1,Number(goal.targetAmount||MADRID_TARGET_AMOUNT)),level=[...MADRID_LEVELS].reverse().find(item=>xp>=item.minXP)||MADRID_LEVELS[0],next=MADRID_LEVELS.find(item=>item.minXP>xp)||null;
  return {...goal,xp,realSavedAmount:saved,moneyPercent:Math.min(100,Math.round(saved/target*100)),level:level.level,levelTitle:level.title,levelIcon:level.icon,nextLevel:next,xpToNext:next?Math.max(0,next.minXP-xp):0};
}

export function applyMadridXPEvent(goal,event){return {...goal,xp:Number(goal.xp||0)+Math.max(0,Number(event?.amount||0)),realSavedAmount:Number(goal.realSavedAmount||0)};}

export function completeMadridChallengeExactlyOnce({challengeId,challenges,xpEvents,userScores,goal,completedByUserId='demo-member-a',now=new Date()}){
  const challenge=challenges.find(item=>item.id===challengeId),key=`madrid-challenge:${challengeId}`;
  if(!challenge||challenge.status!=='completed'||xpEvents.some(event=>event.dedupeKey===key))return {challenges,xpEvents,userScores,goal,xpEvent:null};
  const amount=Math.max(0,Number(challenge.rewardXP||0)),xpEvent={id:generateId('xp'),dedupeKey:key,userId:completedByUserId,challengeId,amount,reason:'madrid_challenge_completed',createdAt:now.toISOString()},updatedScores=userScores.map(user=>user.userId===completedByUserId?{...user,xp:Number(user.xp||0)+amount}:user);
  return {challenges:challenges.map(item=>item.id===challengeId?{...item,rewardClaimed:true,rewardedAt:now.toISOString()}:item),xpEvents:[...xpEvents,xpEvent],userScores:updatedScores,goal:applyMadridXPEvent(goal,{amount:0}),xpEvent};
}

export function madridNextBestAction(tasks=[]){const task=tasks.find(item=>['open','snoozed'].includes(item.status));if(!task)return {title:'הכול מסודר להיום!',description:'המשימה הבאה תופיע כשיהיה משהו שבאמת צריך אתכם',xp:0,taskId:null};return {title:task.type==='missing_receipt'?'חסרה קבלה אחת':task.type==='transaction_review'?'פתרו תעלומה אחת':'יש משימה קצרה בדרך',description:`עוד משימה אחת והכרטיס למדריד מתקרב ✈️⚽`,xp:Number(task.xpReward||0),taskId:task.id}}
