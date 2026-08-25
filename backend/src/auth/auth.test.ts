import { describe, expect, it } from 'bun:test'

import {
  clearLoginAttempts,
  createSessionToken,
  isLoginRateLimited,
  recordLoginFailure,
  sessionCookie,
  verifySessionToken,
} from './auth.ts'

describe('session tokens', () => {
  it('round-trips a valid token back to its userId', async () => {
    const token = await createSessionToken(42)
    expect(await verifySessionToken(token)).toBe(42)
  })

  it('rejects a token with a tampered payload', async () => {
    const token = await createSessionToken(42)
    const [userId, issuedAt, sig] = token.split('.')
    // Cambia el userId sin recalcular la firma: el ataque que
    // verifySessionToken debe bloquear (ver auth.ts).
    const tampered = `${Number(userId) + 1}.${issuedAt}.${sig}`
    expect(await verifySessionToken(tampered)).toBeNull()
  })

  it('rejects a token with a forged/incorrect signature', async () => {
    const token = await createSessionToken(1)
    const [userId, issuedAt] = token.split('.')
    expect(await verifySessionToken(`${userId}.${issuedAt}.forged-signature`)).toBeNull()
  })

  it('rejects malformed tokens', async () => {
    expect(await verifySessionToken('not-a-token')).toBeNull()
    expect(await verifySessionToken('1.2')).toBeNull()
    expect(await verifySessionToken('')).toBeNull()
  })

  it('rejects a token issued more than 7 days ago', async () => {
    const realNow = Date.now
    let oldToken: string
    try {
      // Firma el token "en el pasado" para que su firma sea válida para ese
      // timestamp; luego se restaura Date.now para verificar como si hoy
      // ya pasaron más de los 7 días de vigencia (MAX_AGE_SECONDS).
      Date.now = () => realNow() - 8 * 24 * 60 * 60 * 1000
      oldToken = await createSessionToken(1)
    } finally {
      Date.now = realNow
    }
    expect(await verifySessionToken(oldToken)).toBeNull()
  })
})

describe('sessionCookie', () => {
  it('sets HttpOnly, SameSite=Lax and a 7-day Max-Age', () => {
    const cookie = sessionCookie('abc')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain(`Max-Age=${60 * 60 * 24 * 7}`)
    expect(cookie).toContain('ordenamiento_session=abc')
  })
})

describe('login rate limiting', () => {
  it('allows attempts under the threshold and blocks at/after it', () => {
    const email = `rate-limit-${Math.random()}@example.com`
    for (let i = 0; i < 9; i++) {
      expect(isLoginRateLimited(email)).toBe(false)
      recordLoginFailure(email)
    }
    // 10th recorded failure crosses LOGIN_MAX_ATTEMPTS.
    recordLoginFailure(email)
    expect(isLoginRateLimited(email)).toBe(true)
  })

  it('clears the lockout after a successful login', () => {
    const email = `rate-limit-clear-${Math.random()}@example.com`
    for (let i = 0; i < 10; i++) recordLoginFailure(email)
    expect(isLoginRateLimited(email)).toBe(true)
    clearLoginAttempts(email)
    expect(isLoginRateLimited(email)).toBe(false)
  })

  it('is case-insensitive on the email key', () => {
    const email = `Case-Sensitive-${Math.random()}@Example.com`
    for (let i = 0; i < 10; i++) recordLoginFailure(email)
    expect(isLoginRateLimited(email.toLowerCase())).toBe(true)
    expect(isLoginRateLimited(email.toUpperCase())).toBe(true)
  })
})
