import { json } from '../_utils.js';
import { envStatus } from '../_config.js';
export async function onRequestGet({ env }) {
  return json({ ok:true, ...envStatus(env), timestamp:new Date().toISOString() });
}
