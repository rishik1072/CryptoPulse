/**
 * Security utility for sanitizing untrusted HTML from external APIs
 * Prevents Cross-Site Scripting (XSS) attacks while preserving basic layout formatting.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return ''

  // 1. Remove dangerous executable tags and contents: <script>, <style>, <iframe>, <object>, <embed>, <form>
  let clean = rawHtml.replace(
    /<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi,
    ''
  )

  // 2. Remove self-closing or unclosed dangerous tags
  clean = clean.replace(
    /<(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*\/?>/gi,
    ''
  )

  // 3. Remove inline event handlers (e.g. onload=, onerror=, onclick=)
  clean = clean.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // 4. Neutralize dangerous URL protocols in href or src
  clean = clean.replace(
    /(href|src)\s*=\s*["']\s*(javascript|data|vbscript):[^"']*["']/gi,
    '$1="#"'
  )

  // 5. Ensure all external links include rel="noreferrer noopener" and target="_blank"
  clean = clean.replace(
    /<a\s+([^>]*?)href=(["'][^"']*["'])([^>]*?)>/gi,
    (_match, before, href, after) => {
      // Strip any existing target or rel from before/after
      const cleanBefore = before.replace(/\b(target|rel)=["'][^"']*["']/gi, '').trim()
      const cleanAfter = after.replace(/\b(target|rel)=["'][^"']*["']/gi, '').trim()
      const parts = [cleanBefore, `href=${href}`, 'target="_blank"', 'rel="noreferrer noopener"', cleanAfter].filter(Boolean)
      return `<a ${parts.join(' ')}>`
    }
  )

  return clean
}
