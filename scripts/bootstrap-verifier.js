// Used only by Wrangler's authenticated remote preview, never by production routes.
import {supabase} from '../backend/auth.js';
export async function verifyIdentity(env, id, email) {
  if (!/^[a-f0-9-]{36}$/i.test(id) || typeof email !== 'string' || email.length > 254) return false;
  const account = await supabase(env, `admin/users/${id}`, {admin:true,method:'GET'});
  return account.id === id && account.email?.toLowerCase() === email.toLowerCase() && !!account.email_confirmed_at && (!account.banned_until || Date.parse(account.banned_until) < Date.now());
}
export default {async fetch(request,env) {
  if(request.method !== 'POST' || new URL(request.url).pathname !== '/verify-identity' || request.headers.get('x-requested-with') !== 'partes-bootstrap') return new Response(null,{status:404});
  try {
    const reader=request.body.getReader();let text='';const decoder=new TextDecoder();
    while(true){const {value,done}=await reader.read();if(done)break;text+=decoder.decode(value,{stream:true});if(text.length>2048){await reader.cancel();return new Response(null,{status:413})}}
    const {id,email}=JSON.parse(text);
    return Response.json({verified:await verifyIdentity(env,id,email)},{headers:{'cache-control':'no-store'}});
  }catch{return Response.json({verified:false},{status:400,headers:{'cache-control':'no-store'}})}
}};
