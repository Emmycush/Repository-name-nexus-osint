export function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
export async function body(request){
  try { return await request.json(); } catch { return {}; }
}
export function cleanTarget(value){
  return String(value || "").trim().replace(/[<>]/g,"").slice(0,300);
}
export function isDomain(value){
  return /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(value);
}
export function isIPv4(value){
  const p=value.split(".");
  return p.length===4 && p.every(x=>/^\d+$/.test(x) && +x>=0 && +x<=255);
}
