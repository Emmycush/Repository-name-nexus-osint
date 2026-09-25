import {json, body, cleanTarget} from "../_utils.js";
export async function onRequestPost(context){
  const {target}=await body(context.request);
  const email=cleanTarget(target).toLowerCase();
  const ok=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if(!ok) return json({error:"Enter a valid email address."},400);
  const domain=email.split("@")[1];
  return json({target:email,findings:[
    {label:"Email syntax",value:"Valid format",source:"NEXUS validator"},
    {label:"Domain",value:domain,source:"NEXUS validator"},
    {label:"Public breach search",value:"Not queried by this prototype",source:"NEXUS safety boundary"},
    {label:"Verification",value:"Check the domain using an authorized/public service",source:"NEXUS guidance"}
  ]});
}
