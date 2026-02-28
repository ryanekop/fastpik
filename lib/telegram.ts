
const TELEGRAM_API = 'https://api.telegram.org'

// Country code to dial code mapping
const COUNTRY_DIAL_CODES: Record<string, string> = {
    ID: '62', MY: '60', SG: '65', TH: '66', PH: '63', VN: '84',
    US: '1', GB: '44', AU: '61', JP: '81', KR: '82', CN: '86',
    IN: '91', AE: '971', SA: '966', NZ: '64', HK: '852', TW: '886',
    BR: '55', DE: '49', FR: '33', IT: '39', ES: '34', NL: '31',
}

/** Normalize phone number: strip non-digits, add country dial code if missing */
export function normalizeWhatsappNumber(raw: string, countryCode?: string): string {
    let num = raw.replace(/[^0-9]/g, '')
    const dialCode = COUNTRY_DIAL_CODES[countryCode?.toUpperCase() || ''] || '62'

    if (num.startsWith('0')) {
        // Local format (e.g. 0812...) → replace leading 0 with dial code
        num = dialCode + num.slice(1)
    } else if (!num.startsWith(dialCode) && num.length <= 12) {
        // No country code prefix and short enough to be local → prepend dial code
        num = dialCode + num
    }
    return num
}

function getBotToken(): string {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
    return token
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<{ ok: boolean; description?: string }> {
    const token = getBotToken()
    const url = `${TELEGRAM_API}/bot${token}/sendMessage`

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        })
    })

    const data = await res.json()
    return { ok: data.ok, description: data.description }
}

interface ReminderProject {
    clientName: string
    clientWhatsapp?: string
    link: string
    maxPhotos: number
    password?: string
    selectionStatus: string
    daysLeftSelection?: number
    daysLeftDownload?: number
    projectType?: string
    printSizes?: { name: string; quota: number }[]
    daysLeftPrint?: number
    printStatus?: string
    isExtra?: boolean
    countryCode?: string
}

function compileTemplate(template: string, variables: Record<string, string>): string {
    let msg = template
    Object.entries(variables).forEach(([key, val]) => {
        msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), val)
    })
    // Remove any unreplaced variables
    msg = msg.replace(/{{(\w+)}}/g, '').replace(/\n{3,}/g, '\n\n').trim()
    return msg
}

export function formatReminderMessage(
    projects: ReminderProject[],
    vendorName?: string,
    reminderTemplate?: { id: string; en: string } | null,
    lang: 'id' | 'en' = 'id',
    reminderTemplateExtra?: { id: string; en: string } | null,
    reminderTemplatePrint?: { id: string; en: string } | null
): string {
    const isEn = lang === 'en'

    const header = vendorName
        ? `🔔 <b>${isEn ? 'Reminder from' : 'Reminder dari'} ${vendorName}</b>`
        : `🔔 <b>Fastpik Reminder</b>`

    const lines: string[] = [header, '']

    for (const p of projects) {
        const isPrint = p.projectType === 'print'

        lines.push(`👤 <b>${p.clientName}</b>`)
        lines.push(`🔗 ${p.link}`)

        if (isPrint) {
            const sizesStr = (p.printSizes || []).map(s => `${s.name}×${s.quota}`).join(', ')
            lines.push(`🖨️ ${isEn ? 'Print' : 'Cetak'}: ${sizesStr}`)
            lines.push(`📋 Status: ${p.printStatus === 'submitted' ? '✅ Submitted' : p.printStatus === 'in_progress' ? '⏳ In Progress' : '⏳ Pending'}`)
        } else {
            lines.push(`📸 Max ${isEn ? 'photos' : 'foto'}: ${p.maxPhotos}`)
            lines.push(`📋 Status: ${p.selectionStatus === 'submitted' ? '✅ Submitted' : '⏳ Pending'}`)
        }

        if (p.daysLeftSelection !== undefined && !isPrint) {
            if (p.daysLeftSelection <= 0) {
                lines.push(`⚠️ <b>${isEn ? 'Selection link EXPIRED!' : 'Link pilih foto SUDAH EXPIRED!'}</b>`)
            } else if (p.daysLeftSelection === 1) {
                lines.push(`⏰ ${isEn ? 'Selection link expires <b>TOMORROW</b>!' : 'Link pilih foto expired <b>BESOK</b>!'}`)
            } else {
                lines.push(`⏰ ${isEn ? `Selection link expires in <b>${p.daysLeftSelection} days</b>` : `Link pilih foto expired dalam <b>${p.daysLeftSelection} hari</b>`}`)
            }
        }

        if (p.daysLeftDownload !== undefined && !isPrint) {
            if (p.daysLeftDownload <= 0) {
                lines.push(`⚠️ <b>${isEn ? 'Download link EXPIRED!' : 'Link download SUDAH EXPIRED!'}</b>`)
            } else if (p.daysLeftDownload === 1) {
                lines.push(`📥 ${isEn ? 'Download link expires <b>TOMORROW</b>!' : 'Link download expired <b>BESOK</b>!'}`)
            } else {
                lines.push(`📥 ${isEn ? `Download link expires in <b>${p.daysLeftDownload} days</b>` : `Link download expired dalam <b>${p.daysLeftDownload} hari</b>`}`)
            }
        }

        // Print expiry
        if (p.daysLeftPrint !== undefined && isPrint) {
            if (p.daysLeftPrint <= 0) {
                lines.push(`⚠️ <b>${isEn ? 'Print selection link EXPIRED!' : 'Link pilih cetak SUDAH EXPIRED!'}</b>`)
            } else if (p.daysLeftPrint === 1) {
                lines.push(`🖨️ ${isEn ? 'Print selection expires <b>TOMORROW</b>!' : 'Link pilih cetak expired <b>BESOK</b>!'}`)
            } else {
                lines.push(`🖨️ ${isEn ? `Print selection expires in <b>${p.daysLeftPrint} days</b>` : `Link pilih cetak expired dalam <b>${p.daysLeftPrint} hari</b>`}`)
            }
        }

        lines.push('') // separator between projects

        // WhatsApp reminder link
        if (p.clientWhatsapp) {
            const daysLeft = isPrint ? p.daysLeftPrint : (p.daysLeftSelection ?? p.daysLeftDownload)
            const durationText = isEn
                ? (daysLeft === 1 ? 'tomorrow' : `${daysLeft} days`)
                : (daysLeft === 1 ? 'besok' : `${daysLeft} hari`)

            // Build template variables
            const variables: Record<string, string> = {
                client_name: p.clientName,
                link: p.link,
                count: p.maxPhotos.toString(),
                max_photos: p.maxPhotos.toString(),
                duration: durationText,
                download_duration: durationText
            }
            if (p.password) {
                variables.password = p.password
            }
            if (isPrint) {
                const sizesStr = (p.printSizes || []).map(s => `${s.name}×${s.quota}`).join(', ')
                variables.print_sizes = sizesStr
                variables.print_duration = durationText
            }

            let reminderText: string

            // Use custom template if available — select by type
            let selectedTemplate: { id: string; en: string } | null | undefined
            if (isPrint) {
                selectedTemplate = reminderTemplatePrint
            } else if (p.isExtra) {
                selectedTemplate = reminderTemplateExtra
            } else {
                selectedTemplate = reminderTemplate
            }
            const tmplText = (lang === 'id' ? selectedTemplate?.id?.trim() : selectedTemplate?.en?.trim())
                || selectedTemplate?.id?.trim() || selectedTemplate?.en?.trim() || ''
            if (tmplText) {
                reminderText = compileTemplate(tmplText, variables)
            } else {
                // Default fallback message (matches dashboard waReminderMessage format)
                const parts: string[] = []
                if (isEn) {
                    parts.push(`Hi ${p.clientName},`)
                    parts.push('')
                    parts.push(isPrint ? 'This is a reminder to select your print photos.' : 'This is a reminder to select your photos.')
                    parts.push('')
                    parts.push(`Please select at the following link:`)
                    parts.push(p.link)
                    parts.push('')
                    parts.push(`Remaining time: ${durationText}`)
                    if (isPrint) {
                        const sizesStr = (p.printSizes || []).map(s => `${s.name}×${s.quota}`).join(', ')
                        parts.push(`Print sizes: ${sizesStr}`)
                    }
                    parts.push('')
                    parts.push('Thank you!')
                } else {
                    parts.push(`Halo ${p.clientName},`)
                    parts.push('')
                    parts.push(isPrint ? 'Ini adalah pengingat untuk segera memilih foto cetak Anda.' : 'Ini adalah pengingat untuk segera memilih foto Anda.')
                    parts.push('')
                    parts.push('Silakan pilih di link berikut:')
                    parts.push(p.link)
                    parts.push('')
                    parts.push(`Sisa waktu: ${durationText}`)
                    if (isPrint) {
                        const sizesStr = (p.printSizes || []).map(s => `${s.name}×${s.quota}`).join(', ')
                        parts.push(`Ukuran cetak: ${sizesStr}`)
                    }
                    parts.push('')
                    parts.push('Terima kasih!')
                }
                if (p.password) {
                    parts.push('')
                    parts.push(`🔐 Password: ${p.password}`)
                }
                reminderText = parts.join('\n')
            }

            const waNumber = normalizeWhatsappNumber(p.clientWhatsapp, p.countryCode)
            const waLink = `https://api.whatsapp.com/send/?phone=${waNumber}&text=${encodeURIComponent(reminderText)}`
            lines.push(`💬 <a href="${waLink}">${isEn ? 'Send reminder via WhatsApp' : 'Kirim reminder via WhatsApp'}</a>`)
            lines.push('')
        }
    }

    lines.push(`💡 ${isEn ? 'Remind your clients to select/download photos before the link expires.' : 'Segera ingatkan klien untuk memilih/download foto sebelum linknya berakhir.'}`)

    return lines.join('\n')
}

