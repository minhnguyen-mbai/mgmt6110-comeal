/**
 * CoMeal SG - Safe Logger
 * Enforces sanitization of sensitive data (API keys, full comments, exact addresses).
 */

export function safeLog(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const safeMeta: Record<string, any> = {};

  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      // Filter out sensitive keys
      if (/key|secret|token|auth|password|address|home/i.test(key)) {
        safeMeta[key] = '[REDACTED]';
      } else if (key === 'comment' && typeof value === 'string') {
        // Redact or truncate free-text comments
        safeMeta['commentLength'] = value.length;
        safeMeta['commentSnippet'] = value.substring(0, 20) + (value.length > 20 ? '...' : '');
      } else {
        safeMeta[key] = value;
      }
    }
  }

  const logPayload = {
    timestamp,
    level,
    message,
    ...(Object.keys(safeMeta).length > 0 ? { meta: safeMeta } : {}),
  };

  if (level === 'error') {
    console.error(JSON.stringify(logPayload));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logPayload));
  } else {
    console.log(JSON.stringify(logPayload));
  }
}
