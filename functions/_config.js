export const VERSION = '10.0.0';
export function envStatus(env){
  return { version: VERSION, environment: env.APP_ENV || 'development', databaseConfigured: !!env.DB, databaseName: env.DB_NAME || 'nexus-osint-db', authMode: 'session-cookie' };
}
export function requiredEnv(env){ return []; }
export function publicConfig(env){
  return { version: VERSION, environment: env.APP_ENV || 'development', features: { billing: true, providerHealth: true, evidenceGraph: true, advancedReports: true } };
}
