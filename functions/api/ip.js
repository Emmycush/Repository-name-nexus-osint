import {json, body, cleanTarget, isIPv4} from "../_utils.js";

export async function onRequestPost(context){
  const {target}=await body(context.request);
  const ip=cleanTarget(target);
  if(!isIPv4(ip)) return json({error:"This module currently accepts IPv4 addresses only."},400);
  try{
    const r=await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    const d=await r.json();
    if(d.success===false) return json({error:d.message || "IP lookup failed"},400);
    const findings=[
      {label:"IP address",value:d.ip,source:"ipwho.is"},
      {label:"Country / region",value:[d.country,d.region].filter(Boolean).join(" · ") || "Not returned",source:"ipwho.is"},
      {label:"City",value:d.city || "Not returned",source:"ipwho.is"},
      {label:"ASN / ISP",value:[d.connection?.asn,d.connection?.isp].filter(Boolean).join(" · ") || "Not returned",source:"ipwho.is"},
      {label:"Organization",value:d.connection?.org || "Not returned",source:"ipwho.is"}
    ];
    return json({target:ip,findings});
  }catch{
    return json({error:"Public IP service unavailable."},502);
  }
}
