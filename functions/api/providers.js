
import {json} from "../_utils.js";
import {requireUser} from "../_auth.js";
import {rateLimit} from "../_rate.js";

const providers=[
  ["RDAP","https://rdap.org/domain/example.com"],
  ["Cloudflare DNS","https://cloudflare-dns.com/dns-query?name=example.com&type=A"],
  ["ipwho.is","https://ipwho.is/1.1.1.1"],
  ["GitHub","https://github.com/"],
  ["GitLab","https://gitlab.com/"],
  ["Reddit","https://www.reddit.com/"]
];

export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  const rl=await rateLimit(context,`providers:${user.id}`,20,60);
  if(!rl.ok) return json({error:"Rate limit exceeded"},429);
  const results=await Promise.all(providers.map(async([name,url])=>{
    const started=Date.now();
    try{
      const r=await fetch(url,{method:"HEAD",redirect:"manual"});
      return {name,status:r.status,ok:r.status<500,latencyMs:Date.now()-started};
    }catch(e){return {name,status:0,ok:false,latencyMs:Date.now()-started,error:e.message||"request failed"}}
  }));
  return json({providers:results,checkedAt:new Date().toISOString()});
}
