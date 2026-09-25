import { json } from '../_utils.js';
export async function onRequestGet({ env }) {
  if(!env.DB) return json({ready:false, checks:{database:false}},503);
  try { await env.DB.prepare('SELECT 1').first(); return json({ready:true, checks:{database:true}}); }
  catch { return json({ready:false, checks:{database:false}},503); }
}
