import {json, body, cleanTarget, isDomain} from "../_utils.js";

export async function onRequestPost(context){
  const {target} = await body(context.request);
  const domain = cleanTarget(target).toLowerCase().replace(/^https?:\/\//,"").split("/")[0];
  if(!isDomain(domain)) return json({error:"Enter a valid domain, e.g. example.com"},400);

  const findings=[];
  try{
    const rdap = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers:{accept:"application/rdap+json, application/json"}
    });
    if(rdap.ok){
      const d=await rdap.json();
      findings.push({label:"Domain",value:d.ldhName || domain,source:"RDAP"});
      if(d.status) findings.push({label:"Domain status",value:d.status.join(", "),source:"RDAP"});
      if(d.events){
        const reg=d.events.find(x=>x.eventAction==="registration");
        const exp=d.events.find(x=>x.eventAction==="expiration");
        if(reg) findings.push({label:"Registration",value:reg.eventDate,source:"RDAP"});
        if(exp) findings.push({label:"Expiration",value:exp.eventDate,source:"RDAP"});
      }
      if(d.nameservers?.length) findings.push({label:"Nameservers",value:d.nameservers.map(n=>n.ldhName).join(", "),source:"RDAP"});
    }
  }catch{}

  for(const type of ["A","AAAA","MX","NS"]){
    try{
      const r=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,{
        headers:{accept:"application/dns-json"}
      });
      if(r.ok){
        const d=await r.json();
        const answers=(d.Answer||[]).map(a=>a.data).slice(0,8);
        if(answers.length) findings.push({label:`DNS ${type}`,value:answers.join(", "),source:"Cloudflare DNS"});
      }
    }catch{}
  }
  return json({target:domain,findings});
}
