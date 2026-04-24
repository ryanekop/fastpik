import enMessages from '@/messages/en.json'
import idMessages from '@/messages/id.json'
import type { AuthLocale } from '@/lib/auth-redirect'

type AdminMessages = typeof idMessages.Admin
type AdminMessageKey = keyof AdminMessages

const ADMIN_MESSAGES: Record<AuthLocale, AdminMessages> = {
    id: idMessages.Admin,
    en: enMessages.Admin,
}

export function adminAuthMessage(locale: AuthLocale, key: AdminMessageKey) {
    return ADMIN_MESSAGES[locale][key] || ADMIN_MESSAGES.id[key]
}
