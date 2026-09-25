
export async function rateLimit(context, key, limit=30, windowSeconds=60){
  // D1-backed lightweight limiter. For high-scale production, replace with
  // Cloudflare Rate Limiting/Workers KV/Durable Objects.
  if(!context.env?.DB) return {ok:true,remaining:limit};
  const now=Math.floor(Date.now()/1000);
  const bucket=Math.floor(now/windowSeconds);
  const id=`${key}:${bucket}`;
  try{
    await context.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS rate_limits(
        bucket_key TEXT PRIMARY KEY,
        hits INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER NOT NULL
      )
    `).run();
    await context.env.DB.prepare(`
      INSERT INTO rate_limits(bucket_key,hits,expires_at) VALUES(?,?,?)
      ON CONFLICT(bucket_key) DO UPDATE SET hits=hits+1
    `).bind(id,1,(bucket+1)*windowSeconds).run();
    const row=await context.env.DB.prepare("SELECT hits FROM rate_limits WHERE bucket_key=?").bind(id).first();
    const hits=Number(row?.hits||0);
    return {ok:hits<=limit,remaining:Math.max(0,limit-hits)};
  }catch{
    return {ok:true,remaining:limit};
  }
}
