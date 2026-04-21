
import { createClient } from './server'

export interface PrintSize {
    name: string
    quota: number
}

export interface PrintTemplate {
    name: string
    sizes: PrintSize[]
}

export interface Settings {
    defaultMaxPhotos: number
    defaultDetectSubfolders: boolean
    defaultCountryCode: string
    defaultExpiryDays: number
    defaultSelectionEnabled: boolean
    defaultDownloadEnabled: boolean
    defaultExtraEnabled: boolean
    defaultExtraMaxPhotos: number | null
    defaultExtraExpiryDays: number | null
    defaultPrintSelectionEnabled: boolean
    dashboardDurationDisplay: 'selection' | 'download'
    printEnabled: boolean
    printTemplates: PrintTemplate[]
    defaultPrintExpiryDays: number | null
    clientChooseActionText: { id: string; en: string }
}

export async function getSettings(): Promise<Settings> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle()

    if (error || !data) {
        // Return defaults if no settings found (or error)
        return {
            defaultMaxPhotos: 10,
            defaultDetectSubfolders: false,
            defaultCountryCode: '+62',
            defaultExpiryDays: 7,
            defaultSelectionEnabled: true,
            defaultDownloadEnabled: true,
            defaultExtraEnabled: false,
            defaultExtraMaxPhotos: null,
            defaultExtraExpiryDays: null,
            defaultPrintSelectionEnabled: false,
            dashboardDurationDisplay: 'selection',
            printEnabled: false,
            printTemplates: [],
            defaultPrintExpiryDays: null,
            clientChooseActionText: { id: '', en: '' }
        }
    }

    return {
        defaultMaxPhotos: data.default_max_photos,
        defaultDetectSubfolders: data.default_detect_subfolders || false,
        defaultCountryCode: data.default_country_code,
        defaultExpiryDays: data.default_expiry_days,
        defaultSelectionEnabled: data.default_selection_enabled !== false,
        defaultDownloadEnabled: data.default_download_enabled !== false,
        defaultExtraEnabled: Boolean(data.default_extra_enabled),
        defaultExtraMaxPhotos: data.default_extra_max_photos ?? null,
        defaultExtraExpiryDays: data.default_extra_expiry_days ?? null,
        defaultPrintSelectionEnabled: Boolean(data.default_print_selection_enabled),
        dashboardDurationDisplay: data.dashboard_duration_display || 'selection',
        printEnabled: data.print_enabled || false,
        printTemplates: data.print_templates || [],
        defaultPrintExpiryDays: data.default_print_expiry_days ?? null,
        clientChooseActionText: data.client_choose_action_text || { id: '', en: '' }
    }
}

export async function updateSettings(settings: Partial<Settings>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check if settings exist, if not create
    const { count } = await supabase
        .from('settings')
        .select('*', { count: 'exact', head: true })

    const dbData: any = {
        user_id: user.id
    }

    if (settings.defaultMaxPhotos !== undefined) dbData.default_max_photos = settings.defaultMaxPhotos
    if (settings.defaultDetectSubfolders !== undefined) dbData.default_detect_subfolders = settings.defaultDetectSubfolders
    if (settings.defaultCountryCode !== undefined) dbData.default_country_code = settings.defaultCountryCode
    if (settings.defaultExpiryDays !== undefined) dbData.default_expiry_days = settings.defaultExpiryDays
    if (settings.defaultSelectionEnabled !== undefined) dbData.default_selection_enabled = settings.defaultSelectionEnabled
    if (settings.defaultDownloadEnabled !== undefined) dbData.default_download_enabled = settings.defaultDownloadEnabled
    if (settings.defaultExtraEnabled !== undefined) dbData.default_extra_enabled = settings.defaultExtraEnabled
    if (settings.defaultExtraMaxPhotos !== undefined) dbData.default_extra_max_photos = settings.defaultExtraMaxPhotos
    if (settings.defaultExtraExpiryDays !== undefined) dbData.default_extra_expiry_days = settings.defaultExtraExpiryDays
    if (settings.defaultPrintSelectionEnabled !== undefined) dbData.default_print_selection_enabled = settings.defaultPrintSelectionEnabled
    if (settings.dashboardDurationDisplay !== undefined) dbData.dashboard_duration_display = settings.dashboardDurationDisplay
    if (settings.printEnabled !== undefined) dbData.print_enabled = settings.printEnabled
    if (settings.printTemplates !== undefined) dbData.print_templates = settings.printTemplates
    if (settings.defaultPrintExpiryDays !== undefined) dbData.default_print_expiry_days = settings.defaultPrintExpiryDays
    if (settings.clientChooseActionText !== undefined) dbData.client_choose_action_text = settings.clientChooseActionText

    let error;
    if (count === 0) {
        // Insert
        const { error: insertError } = await supabase
            .from('settings')
            .insert(dbData)
        error = insertError
    } else {
        // Update
        const { error: updateError } = await supabase
            .from('settings')
            .update(dbData)
            .eq('user_id', user.id)
        error = updateError
    }

    if (error) throw error
    return true
}
