// GET -> { enabled, keyId }. The app shows "Pay online" only when this is enabled.
import { env, json, paymentsReady, preflight } from './_lib/server.js'

export function OPTIONS() { return preflight() }
export function GET() {
  return json({ enabled: paymentsReady(), keyId: paymentsReady() ? env.keyId : null })
}
