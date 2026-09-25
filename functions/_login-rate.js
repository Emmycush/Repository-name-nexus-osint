export async function loginRateLimit(context,key,limit=8,windowSeconds=900){
  if(!context.env?.DB) return {ok:true,remaining:limit};
  const now=Math.floor(Date.now()/1000);
  const row=await context.env.DB.prepare("SELECT hits,window_started_at,blocked_until FROM login_attempts WHERE attempt_key=?").bind(key).first();
  if(row && Number(row.blocked_until)>now) return {ok:false,remaining:0,retryAfter:Number(row.blocked_until)-now};
  let hits=Number(row?.hits||0), start=Number(row?.window_started_at||now);
  if(now-start>=windowSeconds){hits=0;start=now;}
  hits++;
  const blocked=hits>limit ? now+windowSeconds : 0;
  await context.env.DB.prepare(`INSERT INTO login_attempts(attempt_key,hits,window_started_at,blocked_until) VALUES(?,?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET hits=excluded.hits,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until`).bind(key,hits,start,blocked).run();
  return {ok:!blocked,remaining:Math.max(0,limit-hits),retryAfter:blocked?windowSeconds:0};
}
