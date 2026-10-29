import type { Session } from '@supabase/supabase-js'

export const PRIVACY_VERSION = '2026-11-beta'
export const PRIVACY_CONTACT_EMAIL = (import.meta.env.VITE_PRIVACY_CONTACT_EMAIL as string | undefined) || ''

export function consentMetadata() {
  return { privacy_consent_at: new Date().toISOString(), privacy_version: PRIVACY_VERSION }
}

export function hasConsented(session: Session | null) {
  return Boolean(session?.user?.user_metadata?.privacy_consent_at)
}
