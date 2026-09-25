import { json } from '../_utils.js';
import { publicConfig } from '../_config.js';
export async function onRequestGet({ env }) { return json(publicConfig(env)); }
