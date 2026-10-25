export type Priority = 'urgent' | 'high' | 'routine' | 'unknown';
export type Role = 'Supervisor' | 'Attendant' | 'Citizen';
export type TaskKind = 'Cleaning' | 'Inspection' | 'Repair' | 'Replenishment';
export type TaskStatus = 'Open' | 'Assigned' | 'In progress' | 'Blocked' | 'Completed';
export type Category = 'Needs cleaning' | 'No water' | 'Blocked fixture' | 'Soap unavailable' | 'Facility closed' | 'Other';
export type Facility = { id: string; name: string; locality: string; lng: number; lat: number; status: 'Open' | 'Closed' | 'Unknown'; accessible: 'Yes' | 'No' | 'Unknown'; water: 'Available' | 'Unavailable' | 'Unknown'; lastCleaned: number | null; verifiedAt: number | null; source: string; sourceUrl: string | null; retrievedAt: string; coordinateProvenance: string; demo: boolean; openingHours?: string; };
export type Usage = { id: string; facilityId: string; count: number; start: number; end: number; createdAt: number; corrected?: boolean; source: 'simulated' | 'manual'; note?: string; };
export type Report = { id: string; facilityId: string; category: Category; note: string; createdAt: number; status: 'Unverified' | 'Verified' | 'Resolved' | 'Dismissed'; resolvedAt?: number; resolution?: string; };
export type Task = { id: string; facilityId: string; kind: TaskKind; status: TaskStatus; assignee: string; createdAt: number; dueAt: number; completedAt?: number; reportIds: string[]; checklist: string[]; note: string; };
export type Activity = { id: string; facilityId: string; at: number; text: string; };
export type State = { version: 1; facilities: Facility[]; usage: Usage[]; reports: Report[]; tasks: Task[]; activity: Activity[]; policy: { visits: number; hours: number; }; };
export type Action =
 | { type: 'usage'; facilityId: string; count: number; start: number; end: number; id: string; now: number }
 | { type: 'correct'; usageId: string; reason: string; now: number }
 | { type: 'report'; facilityId: string; category: Category; note: string; id: string; now: number }
 | { type: 'report-status'; id: string; status: 'Verified' | 'Dismissed'; reason: string; now: number }
 | { type: 'inspection'; facilityId: string; water: Facility['water']; status: Facility['status']; now: number }
 | { type: 'create-task'; facilityId: string; kind: TaskKind; assignee: string; now: number }
 | { type: 'task'; id: string; status: TaskStatus; assignee: string; checklist: string[]; note: string; resolveIds: string[]; now: number }
 | { type: 'policy'; visits: number; hours: number; now: number };
export const categories: Category[] = ['Needs cleaning','No water','Blocked fixture','Soap unavailable','Facility closed','Other'];
export const attendants = ['Asha Patil', 'Rohan More', 'Meera Shah'];
export const checklists: Record<TaskKind,string[]> = {
 Cleaning: ['Clean and disinfect fixtures', 'Clean floors and touchpoints', 'Remove waste and restock supplies', 'Check water and leave facility ready'],
 Inspection: ['Inspect the reported condition', 'Check water and fixture operation', 'Record findings and required follow-up'],
 Repair: ['Identify and isolate faulty fixture', 'Repair and test the fixture', 'Confirm safe operation'],
 Replenishment: ['Check soap and consumables', 'Replenish missing supplies', 'Verify dispensers work'],
};
export function uid(prefix='SF') { return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`; }
export function visits(s: State, f: Facility) { return s.usage.filter(u=>u.facilityId===f.id&&!u.corrected&&(f.lastCleaned===null||u.end>f.lastCleaned)).reduce((a,u)=>a+u.count,0); }
export function priority(s: State, f: Facility, now=Date.now()): {level: Priority; reason: string; score: number} {
 const issues=s.reports.filter(r=>r.facilityId===f.id&&!['Resolved','Dismissed'].includes(r.status));
 if(issues.some(r=>r.status==='Verified'&&['No water','Blocked fixture'].includes(r.category))) return {level:'urgent',reason:'Verified service issue · repair required',score:100};
 if(s.tasks.some(t=>t.facilityId===f.id&&t.status!=='Completed'&&t.dueAt<now)) return {level:'urgent',reason:'Maintenance task overdue',score:95};
 if(issues.some(r=>r.category==='No water')) return {level:'high',reason:'Water issue reported · inspection required',score:85};
 if(issues.some(r=>r.status==='Verified')) return {level:'high',reason:'Verified issue · attention required',score:82};
 if(f.lastCleaned===null||!s.usage.some(u=>u.facilityId===f.id&&!u.corrected)) return {level:'unknown',reason:'Insufficient usage or cleaning records',score:20};
 if(visits(s,f)>=s.policy.visits) return {level:'high',reason:'Usage threshold exceeded since cleaning',score:80};
 if((now-f.lastCleaned)/3600000>=s.policy.hours) return {level:'high',reason:'Cleaning interval exceeded',score:75};
 if(issues.length) return {level:'high',reason:'Citizen report · inspection required',score:70};
 return {level:'routine',reason:'Within configured cleaning thresholds',score:10};
}
export function freshness(f: Facility, now=Date.now()) { return !f.verifiedAt?'Never verified':now-f.verifiedAt>86400000?'Stale':'Recently checked'; }
export function reduce(s: State, a: Action): State {
 const n=structuredClone(s); const log=(facilityId:string,text:string)=>n.activity.unshift({id:uid('EV'),facilityId,at:a.now,text});
 const requireFacility=(id:string)=>{const f=n.facilities.find(f=>f.id===id);if(!f||!f.demo)throw new Error('Demo actions require an illustrative facility.');return f;};
 if(a.type==='usage'){
  requireFacility(a.facilityId);if(n.usage.some(u=>u.id===a.id))return s;
  if(!Number.isInteger(a.count)||a.count<1||a.count>10000||a.start>a.end||a.end>a.now+60000)throw new Error('Enter a valid count and observation interval.');
  n.usage.push({id:a.id,facilityId:a.facilityId,count:a.count,start:a.start,end:a.end,createdAt:a.now,source:'manual'});log(a.facilityId,`${a.count} visits recorded · demo observation`);
 }else if(a.type==='correct'){
  const u=n.usage.find(u=>u.id===a.usageId);if(!u||u.corrected||!a.reason.trim())throw new Error('A valid observation and correction reason are required.');requireFacility(u.facilityId);u.corrected=true;u.note=a.reason;log(u.facilityId,`Usage entry corrected: ${a.reason}`);
 }else if(a.type==='report'){
  requireFacility(a.facilityId);if(n.reports.some(r=>r.id===a.id))return s;
  if(!categories.includes(a.category)||a.note.length>1000)throw new Error('Choose a valid report category.');
  if(n.reports.some(r=>r.facilityId===a.facilityId&&r.category===a.category&&r.status==='Unverified'&&a.now-r.createdAt<60000))throw new Error('A similar report was just submitted. Please wait a minute.');
  n.reports.unshift({id:a.id,facilityId:a.facilityId,category:a.category,note:a.note,createdAt:a.now,status:'Unverified'});
  const existing=n.tasks.find(t=>t.facilityId===a.facilityId&&t.kind==='Inspection'&&t.status!=='Completed');
  if(existing)existing.reportIds.push(a.id);else n.tasks.unshift({id:uid('TASK'),facilityId:a.facilityId,kind:'Inspection',status:'Open',assignee:'',createdAt:a.now,dueAt:a.now+3600000,reportIds:[a.id],checklist:[],note:''});
  log(a.facilityId,`${a.category} reported · awaiting verification`);
 }else if(a.type==='report-status'){
  const r=n.reports.find(r=>r.id===a.id);if(!r||!['Unverified','Verified'].includes(r.status))throw new Error('This report is no longer open.');requireFacility(r.facilityId);
  if(a.status==='Dismissed'&&!a.reason.trim())throw new Error('Please give a dismissal reason.');r.status=a.status;r.resolution=a.reason;log(r.facilityId,`Report ${a.status.toLowerCase()}${a.reason?`: ${a.reason}`:''}`);
 }else if(a.type==='inspection'){
  const f=requireFacility(a.facilityId);f.verifiedAt=a.now;f.water=a.water;f.status=a.status;log(f.id,`Staff inspection · water ${a.water.toLowerCase()} · facility ${a.status.toLowerCase()}`);
 }else if(a.type==='create-task'){
  requireFacility(a.facilityId);if(n.tasks.some(t=>t.facilityId===a.facilityId&&t.kind===a.kind&&t.status!=='Completed'))throw new Error('An open task of this type already exists.');
  n.tasks.unshift({id:uid('TASK'),facilityId:a.facilityId,kind:a.kind,status:a.assignee?'Assigned':'Open',assignee:a.assignee,createdAt:a.now,dueAt:a.now+7200000,reportIds:n.reports.filter(r=>r.facilityId===a.facilityId&&r.status==='Verified').map(r=>r.id),checklist:[],note:''});log(a.facilityId,`${a.kind} task created${a.assignee?` · assigned to ${a.assignee}`:''}`);
 }else if(a.type==='task'){
  const t=n.tasks.find(t=>t.id===a.id);if(!t)throw new Error('Task not found.');const f=requireFacility(t.facilityId);
  const allowed:Record<TaskStatus,TaskStatus[]>={'Open':['Assigned','In progress'],'Assigned':['Assigned','In progress'],'In progress':['In progress','Blocked','Completed'],'Blocked':['In progress','Assigned'],'Completed':['Open']};
  if(!allowed[t.status].includes(a.status))throw new Error('This task transition is not available.');
  if(['Assigned','In progress','Completed'].includes(a.status)&&!attendants.includes(a.assignee))throw new Error('Choose an attendant.');
  if(a.status==='Blocked'&&!a.note.trim())throw new Error('Please explain what is blocking the task.');
  if(a.status==='Completed'&&!checklists[t.kind].every(c=>a.checklist.includes(c)))throw new Error('Complete every checklist item first.');
  if(a.status==='Completed'){
   for(const id of a.resolveIds){const r=n.reports.find(r=>r.id===id&&r.facilityId===f.id);if(!r||r.status!=='Verified')throw new Error('Only verified reports can be resolved.');const compatible=t.kind==='Cleaning'?['Needs cleaning']:t.kind==='Repair'?['No water','Blocked fixture']:t.kind==='Replenishment'?['Soap unavailable']:[];if(!compatible.includes(r.category))throw new Error('This issue needs a different type of task.');r.status='Resolved';r.resolvedAt=a.now;r.resolution=a.note;}
   t.completedAt=a.now;if(t.kind==='Cleaning')f.lastCleaned=a.now;
  }
  if(a.status==='Open')t.completedAt=undefined;
  t.status=a.status;t.assignee=a.assignee;t.checklist=a.checklist;t.note=a.note;log(f.id,`${t.kind} task ${a.status.toLowerCase()}${a.note?` · ${a.note}`:''}`);
 }else if(a.type==='policy'){
  if(!Number.isInteger(a.visits)||a.visits<1||a.visits>10000||!Number.isFinite(a.hours)||a.hours<.25||a.hours>168)throw new Error('Visits must be 1–10,000; interval must be 0.25–168 hours.');n.policy={visits:a.visits,hours:a.hours};
 }
 return n;
}
export function seed(now=Date.now()): State {
 const rows:[string,string,number,number,number|null,number,Facility['water'],Facility['accessible']][]=[
 ['Harbour Demo Centre','Bhayandar West',72.8470,19.3057,3.2,92,'Available','Yes'],
 ['Grove Demo Centre','Mira Road East',72.8735,19.2827,1.8,68,'Unknown','Yes'],
 ['Meadow Demo Centre','Bhayandar East',72.8603,19.3042,1.1,34,'Available','No'],
 ['Cedar Demo Centre','Mira Road East',72.8652,19.2764,2.4,76,'Available','Yes'],
 ['Palm Demo Centre','Bhayandar West',72.8363,19.2991,.7,18,'Available','Unknown'],
 ['Lagoon Demo Centre','Uttan',72.8141,19.3028,1.2,29,'Available','Yes'],
 ['Orchid Demo Centre','Kashimira',72.8844,19.2834,null,0,'Unknown','Unknown'],
 ['Bay Demo Centre','Bhayandar East',72.8566,19.2905,.5,12,'Available','Yes'],
 ];
 const facilities:Facility[]=rows.map((r,i)=>({id:`demo-${i+1}`,name:r[0],locality:r[1],lng:r[2],lat:r[3],status:i===6?'Unknown':'Open',accessible:r[7],water:r[6],lastCleaned:r[4]===null?null:now-r[4]*3600000,verifiedAt:i===6?null:now-(i+1)*9*60000,source:'SwachhFlow fictional demonstration',sourceUrl:null,retrievedAt:new Date(now).toISOString(),coordinateProvenance:'Illustrative coordinate; not a verified public toilet',demo:true}));
 const usage:Usage[]=rows.flatMap((r,i)=>r[5]?[{id:`seed-u-${i}`,facilityId:`demo-${i+1}`,count:r[5],start:now-1800000,end:now-300000,createdAt:now-300000,source:'simulated' as const}]:[]);
 const reports:Report[]=[{id:'SF-DEMO-001',facilityId:'demo-1',category:'Blocked fixture',note:'One fixture is blocked. Simulated staff observation.',createdAt:now-7200000,status:'Verified'},{id:'SF-DEMO-002',facilityId:'demo-2',category:'No water',note:'Water not running at the washbasin. Simulated citizen report.',createdAt:now-1200000,status:'Unverified'}];
 const tasks:Task[]=[{id:'TASK-DEMO-001',facilityId:'demo-1',kind:'Repair',status:'Assigned',assignee:'Rohan More',createdAt:now-7200000,dueAt:now+1800000,reportIds:['SF-DEMO-001'],checklist:[],note:''},{id:'TASK-DEMO-002',facilityId:'demo-2',kind:'Inspection',status:'Open',assignee:'',createdAt:now-1200000,dueAt:now+2400000,reportIds:['SF-DEMO-002'],checklist:[],note:''},{id:'TASK-DEMO-003',facilityId:'demo-4',kind:'Cleaning',status:'In progress',assignee:'Asha Patil',createdAt:now-1800000,dueAt:now+3600000,reportIds:[],checklist:[],note:''}];
 return {version:1,facilities,usage,reports,tasks,policy:{visits:60,hours:4},activity:facilities.filter(f=>f.lastCleaned).map(f=>({id:`seed-${f.id}`,facilityId:f.id,at:f.lastCleaned!,text:'Cleaning recorded · simulated activity'})).concat(reports.map(r=>({id:`seed-${r.id}`,facilityId:r.facilityId,at:r.createdAt,text:`${r.category} reported · ${r.status.toLowerCase()}`}))).sort((a,b)=>b.at-a.at)};
}
