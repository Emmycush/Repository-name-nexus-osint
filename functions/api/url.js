import {json, body, cleanTarget} from "../_utils.js";

export async function onRequestPost(context){
  const {target}=await body(context.request);
  const value=cleanTarget(target);
  let u;
  try{ u=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`); }
  catch{return json({error:"Enter a valid URL."},400);}
  const findings=[
    {label:"Protocol",value:u.protocol.replace(":","").toUpperCase(),source:"URL parser"},
    {label:"Hostname",value:u.hostname,source:"URL parser"},
    {label:"Port",value:u.port || (u.protocol==="https:"?"443":"80"),source:"URL parser"},
    {label:"Path",value:u.pathname || "/",source:"URL parser"},
    {label:"Query parameters",value:String([...u.searchParams.keys()].length),source:"URL parser"}
  ];
  return json({target:u.href,findings});
}
