import {identity,membership,rateLimit,sameOrigin,supabase,workspace} from '@/lib/backend';
import {Action,attendants,reduce} from '@/lib/model';
import {z} from 'zod';
const base={now:z.number().finite().nonnegative()};
const id=z.string().min(1).max(120),note=z.string().max(1000);
const actionSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('usage'),facilityId:id,count:z.number().int().min(1).max(10000),start:z.number().nonnegative(),end:z.number().nonnegative(),id,...base}),
 z.object({type:z.literal('correct'),usageId:id,reason:note.min(1),...base}),
 z.object({type:z.literal('report'),facilityId:id,category:z.enum(['Needs cleaning','No water','Blocked fixture','Soap unavailable','Facility closed','Other']),note,id,...base}),
 z.object({type:z.literal('report-status'),id,status:z.enum(['Verified','Dismissed']),reason:note,...base}),
 z.object({type:z.literal('inspection'),facilityId:id,water:z.enum(['Available','Unavailable','Unknown']),status:z.enum(['Open','Closed','Unknown']),...base}),
 z.object({type:z.literal('create-task'),facilityId:id,kind:z.enum(['Cleaning','Inspection','Repair','Replenishment']),assignee:z.string().max(100),...base}),
 z.object({type:z.literal('task'),id,status:z.enum(['Open','Assigned','In progress','Blocked','Completed']),assignee:z.string().max(100),checklist:z.array(z.string().max(200)).max(10),note,resolveIds:z.array(id).max(30),...base}),
 z.object({type:z.literal('policy'),visits:z.number().int().min(1).max(10000),hours:z.number().min(.25).max(168),...base}),
]);
export async function GET(request:Request){try{const user=await identity(request);const m=await membership(user.id);const w=await workspace(m.workspace_id);return Response.json({state:w.state,revision:w.revision,role:m.role,name:m.display_name},{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:(e as Error).message},{status:401});}}
export async function POST(request:Request){try{sameOrigin(request);const user=await identity(request);rateLimit(`write:${user.id}`,50);const member=await membership(user.id);const input=z.object({revision:z.number().int().nonnegative(),action:actionSchema}).parse(await request.json());const w=await workspace(member.workspace_id);if(w.revision!==input.revision)return Response.json({error:'Another user updated this workspace. Reconnect to load the latest records before retrying.'},{status:409});const a={...input.action,now:Date.now()} as Action;
 if(member.role==='Attendant'){
  if(['policy','create-task'].includes(a.type))throw new Error('Supervisor access required.');
  if(a.type==='task'){const t=w.state.tasks.find(t=>t.id===a.id);if(t?.assignee!==member.display_name||a.assignee!==member.display_name||['Open','Assigned'].includes(a.status))throw new Error('Attendants can update only their own assigned tasks.');}
 }
 if(a.type==='create-task'&&a.assignee&&!attendants.includes(a.assignee))throw new Error('Choose an approved demo attendant.');
 const next=reduce(w.state,a);const rows=await supabase(`/rest/v1/sf_workspaces?id=eq.${encodeURIComponent(w.id)}&revision=eq.${w.revision}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({state:next,revision:w.revision+1})}) as Array<{state:typeof next;revision:number}>;
 if(!rows.length)return Response.json({error:'The workspace changed while saving. Reconnect and try again.'},{status:409});return Response.json({state:rows[0].state,revision:rows[0].revision},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof z.ZodError?'Invalid operation data.':(e as Error).message},{status:400});}}
