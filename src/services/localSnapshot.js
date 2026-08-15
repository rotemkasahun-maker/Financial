import { generateId } from '../utils/id.js';

const STORAGE_KEY='family-finance:local-snapshots:v1';
const MAX_SNAPSHOTS=10;
let memorySnapshots=[];

const storage=()=>globalThis.localStorage;
const read=()=>{try{const value=storage()?.getItem(STORAGE_KEY);return value?JSON.parse(value):structuredClone(memorySnapshots)}catch{return structuredClone(memorySnapshots)}};
const write=snapshots=>{memorySnapshots=structuredClone(snapshots);try{storage()?.setItem(STORAGE_KEY,JSON.stringify(snapshots))}catch{/* Local in-memory fallback for restricted browsers. */}};

export function createLocalSnapshot(data,{reason='manual',now=new Date()}={}){
  const snapshot={id:generateId('snapshot'),createdAt:now.toISOString(),reason,version:1,data:structuredClone(data)};
  write([snapshot,...read()].slice(0,MAX_SNAPSHOTS));
  return {id:snapshot.id,createdAt:snapshot.createdAt,reason:snapshot.reason,version:snapshot.version};
}

export const listLocalSnapshots=()=>read().map(({data,...metadata})=>metadata);

export function loadLocalSnapshot(id){const snapshot=read().find(item=>item.id===id);if(!snapshot)throw new Error('Local snapshot not found');return structuredClone(snapshot)}

export function clearLocalSnapshotsForTests(){memorySnapshots=[];try{storage()?.removeItem(STORAGE_KEY)}catch{/* Test cleanup only. */}}
