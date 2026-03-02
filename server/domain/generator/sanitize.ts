import sanitizeHtml from 'sanitize-html'
import { createError } from 'h3'

const forbiddenCssPatterns = [/javascript:/i, /expression\(/i, /@import/i, /url\(['"]?\s*javascript:/i]

export function sanitizeHtmlFragment(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ['div', 'span', 'svg', 'g', 'path', 'circle', 'rect', 'defs', 'pattern', 'line', 'polyline', 'polygon'],
    allowedAttributes: {
      '*': ['class', 'style', 'viewBox', 'fill', 'stroke', 'd', 'x', 'y', 'cx', 'cy', 'r', 'width', 'height', 'points', 'transform']
    },
    allowedSchemes: []
  })
}

export function sanitizeSvgFragment(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      'svg',
      'defs',
      'filter',
      'feturbulence',
      'fedisplacementmap',
      'fecolormatrix',
      'feblend',
      'fegaussianblur',
      'pattern',
      'rect',
      'g',
      'path',
      'circle',
      'line',
      'polygon'
    ],
    allowedAttributes: {
      '*': ['id', 'x', 'y', 'width', 'height', 'viewBox', 'fill', 'stroke', 'result', 'in', 'in2', 'type', 'baseFrequency', 'numOctaves', 'seed', 'scale', 'values', 'd', 'points', 'stdDeviation', 'patternUnits', 'patternTransform']
    },
    allowedSchemes: []
  })
}

export function sanitizeCssOverride(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return ''
  }

  for (const pattern of forbiddenCssPatterns) {
    if (pattern.test(trimmed)) {
      throw createError({ statusCode: 400, statusMessage: 'Unsafe CSS override detected' })
    }
  }

  return trimmed
}
