import { hkdf } from '@panva/hkdf'
import { EncryptJWT, base64url, calculateJwkThumbprint, jwtDecrypt } from 'jose'

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60
const JWT_ALG = 'dir'
const JWT_ENC = 'A256GCM'

function now() {
  return (Date.now() / 1000) | 0
}

async function getDerivedEncryptionKey(secret: string, salt: string) {
  return hkdf('sha256', secret, salt, `Auth.js Generated Encryption Key (${salt})`, 32)
}

export async function encodeAuthJwt(params: {
  token?: Record<string, unknown>
  secret?: string | string[]
  maxAge?: number
  salt?: string
}) {
  const { token = {}, maxAge = DEFAULT_MAX_AGE, salt = '' } = params
  const secret = Array.isArray(params.secret) ? params.secret[0] : params.secret

  if (!secret) {
    throw new Error('Missing auth JWT secret')
  }

  const encryptionSecret = await getDerivedEncryptionKey(secret, salt)
  const kid = await calculateJwkThumbprint(
    { kty: 'oct', k: base64url.encode(encryptionSecret) },
    `sha${encryptionSecret.byteLength << 3}`
  )

  return new EncryptJWT(token)
    .setProtectedHeader({ alg: JWT_ALG, enc: JWT_ENC, kid })
    .setIssuedAt()
    .setExpirationTime(now() + maxAge)
    .setJti(crypto.randomUUID())
    .encrypt(encryptionSecret)
}

export async function decodeAuthJwt(params: {
  token?: string
  secret?: string | string[]
  salt?: string
}) {
  const { token, salt = '' } = params
  const secrets = Array.isArray(params.secret) ? params.secret : [params.secret]

  if (!token) {
    return null
  }

  const { payload } = await jwtDecrypt(
    token,
    async ({ kid }) => {
      for (const secret of secrets) {
        if (!secret) {
          continue
        }

        const encryptionSecret = await getDerivedEncryptionKey(secret, salt)
        if (!kid) {
          return encryptionSecret
        }

        const thumbprint = await calculateJwkThumbprint(
          { kty: 'oct', k: base64url.encode(encryptionSecret) },
          `sha${encryptionSecret.byteLength << 3}`
        )

        if (kid === thumbprint) {
          return encryptionSecret
        }
      }

      throw new Error('No matching decryption secret')
    },
    {
      clockTolerance: 15,
      keyManagementAlgorithms: [JWT_ALG],
      contentEncryptionAlgorithms: [JWT_ENC]
    }
  )

  return payload
}
