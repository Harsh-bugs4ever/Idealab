import 'server-only';
import {State} from './model';
export function configured(){return !!(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY);}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new Error('Cross-origin request denied.');}
export async function supabase(path:string,init:RequestInit={},token?:string){
 if(!configured())throw new Error('Backend is not configured. Use the local demo or follow README setup.');
 const key=token?process.env.SUPABASE_ANON_KEY!:process.env.SUPABASE_SERVICE_ROLE_KEY!;
 const res=await fetch(`${process.env.SUPABASE_URL!.replace(/\/$/,'')}${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${token||key}`,'Content-Type':'application/json',...(init.headers||{})}});
 if(!res.ok)throw new Error(res.status===401||res.status===403?'Session expired or access denied. Sign in again.':'The backend could not complete this request.');
 if(res.status===204)return null;return res.json();
}
export function sessionToken(request:Request){const cookie=request.headers.get('cookie')||'';return cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('sf-session='))?.slice('sf-session='.length);}
export async function identity(request:Request){const token=sessionToken(request);if(!token)throw new Error('Sign in to access the team workspace.');const user=await supabase('/auth/v1/user',{},token) as {id:string;email?:string};return user;}
export type Membership={user_id:string;workspace_id:string;role:'Supervisor'|'Attendant';display_name:string;};
export type Workspace={id:string;state:State;revision:number;};
export async function membership(userId:string){const rows=await supabase(`/rest/v1/sf_memberships?user_id=eq.${encodeURIComponent(userId)}&select=*`) as Membership[];if(!rows.length)throw new Error('No workspace membership found. Ask the project administrator to provision your account.');return rows[0];}
export async function workspace(id:string){const rows=await supabase(`/rest/v1/sf_workspaces?id=eq.${encodeURIComponent(id)}&select=*`) as Workspace[];if(!rows.length)throw new Error('Workspace not found.');return rows[0];}
export const limitBuckets=new Map<string,{count:number;until:number}>();
export function rateLimit(key:string,max=10){const now=Date.now();if(limitBuckets.size>1000)for(const [k,v]of limitBuckets)if(v.until<now)limitBuckets.delete(k);const b=limitBuckets.get(key);if(b&&b.until>now){if(b.count>=max)throw new Error('Too many requests. Please try again in a minute.');b.count++;}else limitBuckets.set(key,{count:1,until:now+60000});}
