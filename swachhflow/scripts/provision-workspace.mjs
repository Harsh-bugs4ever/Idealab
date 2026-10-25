// Run locally after setting SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// No credentials are printed. Create staff accounts in Supabase Auth first.
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const [userId,displayName='Project supervisor']=process.argv.slice(2);
if(!userId||!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY){console.error('Usage: node --env-file=.env.local scripts/provision-workspace.mjs <auth-user-uuid> [display-name]');process.exit(1);}
if(!/^[0-9a-f-]{36}$/i.test(userId))throw new Error('A Supabase Auth user UUID is required.');
const code=ts.transpileModule(readFileSync(new URL('../lib/model.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {seed}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const rest=async(path,method,body)=>{const res=await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});if(!res.ok)throw new Error(`Provisioning request failed (${res.status}). Check schema and account configuration.`);return res.json();};
const existing=await rest(`sf_memberships?user_id=eq.${userId}&select=workspace_id`,'GET');
if(existing.length){console.log(`Account already provisioned. Workspace: ${existing[0].workspace_id}`);process.exit(0);}
const [w]=await rest('sf_workspaces','POST',{name:'SwachhFlow team demo',state:seed(),revision:0});
await rest('sf_memberships','POST',{user_id:userId,workspace_id:w.id,role:'Supervisor',display_name:displayName});
console.log(`Team demo provisioned. Workspace: ${w.id}. No production facility conditions have been created.`);
