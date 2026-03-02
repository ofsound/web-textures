import { sanitizeCssOverride, sanitizeHtmlFragment, sanitizeSvgFragment } from '~~/server/domain/generator/sanitize'

describe('sanitization', () => {
  it('removes unsafe html tags', () => {
    const unsafe = '<div>ok</div><script>alert(1)</script>'
    const sanitized = sanitizeHtmlFragment(unsafe)

    expect(sanitized).toContain('<div>ok</div>')
    expect(sanitized).not.toContain('<script>')
  })

  it('rejects javascript css payloads', () => {
    expect(() => sanitizeCssOverride('background:url(javascript:alert(1))')).toThrowError(/Unsafe CSS override/i)
  })

  it('keeps valid svg defs', () => {
    const svg = '<filter id="grain"><feTurbulence baseFrequency="0.8" /></filter>'
    const sanitized = sanitizeSvgFragment(svg)

    expect(sanitized.toLowerCase()).toContain('feturbulence')
  })
})
