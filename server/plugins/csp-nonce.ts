function responseBodyToString(body: unknown): string | undefined {
  if (typeof body === 'string') {
    return body
  }
  if (Buffer.isBuffer(body)) {
    return body.toString('utf8')
  }
  if (body instanceof Uint8Array) {
    return new TextDecoder('utf8').decode(body)
  }
  return undefined
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const nonce = event?.context?.cspNonce

    if (!nonce) {
      return
    }

    const html = responseBodyToString(response.body)
    if (!html) {
      return
    }

    const contentTypeHeader = response.headers?.['content-type']
    const contentType = Array.isArray(contentTypeHeader)
      ? String(contentTypeHeader[0] ?? '')
      : String(contentTypeHeader ?? '')

    if (!contentType.includes('text/html')) {
      return
    }

    response.body = html.replace(/<script(?![^>]*\bnonce=)/g, `<script nonce="${nonce}"`)
  })
})
