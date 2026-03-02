export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const nonce = event?.context?.cspNonce

    if (!nonce || typeof response.body !== 'string') {
      return
    }

    const contentTypeHeader = response.headers?.['content-type']
    const contentType = Array.isArray(contentTypeHeader)
      ? String(contentTypeHeader[0] ?? '')
      : String(contentTypeHeader ?? '')

    if (!contentType.includes('text/html')) {
      return
    }

    response.body = response.body.replace(/<script(?![^>]*\bnonce=)/g, `<script nonce="${nonce}"`)
  })
})
