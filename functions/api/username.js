import {json, body, cleanTarget} from "../_utils.js";
export async function onRequestPost(context){
  const {target}=await body(context.request);
  const username=cleanTarget(target).replace(/^@/,"");
  if(!/^[a-zA-Z0-9._-]{2,50}$/.test(username)) return json({error:"Use a simple public username (2–50 characters)."},400);
  return json({target:username,findings:[
    {label:"Normalized username",value:username,source:"NEXUS validator"},
    {label:"Public profile discovery",value:"Provider integration required",source:"NEXUS"},
    {label:"Access control",value:"No private or authenticated profiles are queried",source:"NEXUS safety boundary"},
    {label:"Next step",value:"Connect approved public-profile providers",source:"NEXUS guidance"}
  ]});
}
