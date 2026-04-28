import type { Metadata } from "next"
import { ClientView } from "@/components/client/client-view"
import { getTenantConfig } from "@/lib/tenant-config"
import { getProjectById } from "@/lib/supabase/projects"
import { createServiceClient } from "@/lib/supabase/service"

export const revalidate = 0

type LocalizedText = { id: string; en: string }

type ClientPageParams = {
    locale: string
    slug: string[]
}

type RawClientConfig = {
    id?: string
    clientName?: string
    maxPhotos?: number | null
    adminWhatsapp?: string
    whatsapp?: string
    gdriveLink?: string
    detectSubfolders?: boolean
    expiresAt?: number
    downloadExpiresAt?: number
    selectionEnabled?: boolean
    downloadEnabled?: boolean
    password?: string
    lockedPhotos?: string[]
    selectedPhotos?: string[]
    selectionStatus?: string
    extraEnabled?: boolean
    extraMaxPhotos?: number
    extraExpiresAt?: number
    extraSelectedPhotos?: string[]
    extraStatus?: string
    projectType?: "edit" | "print"
    printEnabled?: boolean
    printExpiresAt?: number
    printSizes?: { name: string; quota: number }[]
    printStatus?: string
    printSelections?: { photo: string; size: string }[]
    [key: string]: unknown
}

type ClientPageData = {
    config: RawClientConfig | null
    projectId: string
    isLegacy: boolean
    templates: {
        resultInitial: { id: string; en: string } | null
        resultExtra: { id: string; en: string } | null
        resultPrint: { id: string; en: string } | null
    } | null
    chooseActionText: LocalizedText | null
    seo: {
        vendorName: string | null
        metaTitle: string | null
        metaDescription: string | null
        metaKeywords: string | null
        avatarUrl: string | null
    }
}

function resolveProjectId(slug: string[]) {
    return slug.length >= 2 ? slug[slug.length - 1] : slug[0]
}

function isHttpUrl(value: string | null | undefined) {
    if (!value) return false
    return /^https?:\/\//i.test(value.trim())
}

function pickSeoImage(avatarUrl: string | null | undefined, tenantLogoUrl: string | null | undefined) {
    if (isHttpUrl(avatarUrl)) return avatarUrl!.trim()
    if (isHttpUrl(tenantLogoUrl)) return tenantLogoUrl!.trim()
    return "/fastpik-logo.png"
}

function renderSeoText(template: string | null | undefined, variables: Record<string, string>, fallback: string) {
    const input = (template || "").trim()
    if (!input) return fallback

    const rendered = input
        .replace(/{{(\w+)}}/g, (_match, key: string) => variables[key] || "")
        .replace(/\s{2,}/g, " ")
        .trim()

    return rendered || fallback
}

function parseSeoKeywords(raw: string | null | undefined) {
    const value = (raw || "").trim()
    if (!value) return []
    return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
}

function toOptionalNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function toStringArray(value: unknown) {
    if (!Array.isArray(value)) return undefined
    const items = value.filter((item): item is string => typeof item === "string")
    return items.length > 0 ? items : []
}

function toPrintSizes(value: unknown) {
    if (!Array.isArray(value)) return undefined
    const sizes = value
        .map((item) => {
            if (!item || typeof item !== "object") return null
            const typed = item as { name?: unknown; quota?: unknown }
            if (typeof typed.name !== "string") return null
            if (typeof typed.quota !== "number" || !Number.isFinite(typed.quota)) return null
            return {
                name: typed.name,
                quota: typed.quota,
            }
        })
        .filter((item): item is { name: string; quota: number } => Boolean(item))

    return sizes.length > 0 ? sizes : []
}

function toPrintSelections(value: unknown) {
    if (!Array.isArray(value)) return undefined
    const selections = value
        .map((item) => {
            if (!item || typeof item !== "object") return null
            const typed = item as { photo?: unknown; size?: unknown }
            if (typeof typed.photo !== "string" || typeof typed.size !== "string") return null
            return { photo: typed.photo, size: typed.size }
        })
        .filter((item): item is { photo: string; size: string } => Boolean(item))

    return selections.length > 0 ? selections : []
}

async function resolveClientPageData(slug: string[]): Promise<ClientPageData> {
    const projectId = resolveProjectId(slug)
    let config: RawClientConfig | null = null
    let isLegacy = false

    // 1. Try legacy Base64 format
    try {
            const decodedProjectId = decodeURIComponent(projectId)
            if (decodedProjectId.length > 50 || decodedProjectId.includes("{")) {
                const json = Buffer.from(decodedProjectId, "base64").toString("utf-8")
                config = JSON.parse(json) as RawClientConfig
                if (!config.adminWhatsapp && config.whatsapp) {
                    config.adminWhatsapp = config.whatsapp
                }
                isLegacy = true
            }
    } catch {
        // Not a legacy config, continue with DB lookup
    }

    // 2. Load DB config when not legacy
    if (!config) {
        try {
            config = (await getProjectById(projectId)) as RawClientConfig | null
        } catch (error) {
            console.error("Failed to fetch project from DB", error)
        }
    }

    if (!config) {
        return {
            config: null,
            projectId,
            isLegacy: false,
            templates: null,
            chooseActionText: null,
            seo: {
                vendorName: null,
                metaTitle: null,
                metaDescription: null,
                metaKeywords: null,
                avatarUrl: null,
            },
        }
    }

    let templates: ClientPageData["templates"] = null
    let chooseActionText: LocalizedText | null = null
    let seo: ClientPageData["seo"] = {
        vendorName: null,
        metaTitle: null,
        metaDescription: null,
        metaKeywords: null,
        avatarUrl: null,
    }

    if (!isLegacy && config.id) {
        try {
            const supabase = createServiceClient()
            const { data: project } = await supabase
                .from("projects")
                .select("user_id")
                .eq("id", config.id)
                .single()

            if (project?.user_id) {
                const [{ data: settings }, { data: profile }] = await Promise.all([
                    supabase
                        .from("settings")
                        .select("msg_tmpl_result_initial, msg_tmpl_result_extra, msg_tmpl_result_print, client_choose_action_text, vendor_name, seo_meta_title, seo_meta_description, seo_meta_keywords")
                        .eq("user_id", project.user_id)
                        .maybeSingle(),
                    supabase
                        .from("profiles")
                        .select("avatar_url")
                        .eq("id", project.user_id)
                        .maybeSingle(),
                ])

                if (settings) {
                    templates = {
                        resultInitial: settings.msg_tmpl_result_initial,
                        resultExtra: settings.msg_tmpl_result_extra,
                        resultPrint: settings.msg_tmpl_result_print,
                    }
                    chooseActionText = settings.client_choose_action_text || null
                }

                seo = {
                    vendorName: settings?.vendor_name || null,
                    metaTitle: settings?.seo_meta_title || null,
                    metaDescription: settings?.seo_meta_description || null,
                    metaKeywords: settings?.seo_meta_keywords || null,
                    avatarUrl: profile?.avatar_url || null,
                }
            }
        } catch (error) {
            console.error("Failed to fetch client settings", error)
        }
    }

    return {
        config,
        projectId,
        isLegacy,
        templates,
        chooseActionText,
        seo,
    }
}

export async function generateMetadata({ params }: { params: Promise<ClientPageParams> }): Promise<Metadata> {
    const { slug, locale } = await params
    const tenant = await getTenantConfig()
    const pageData = await resolveClientPageData(slug)

    if (!pageData.config) {
        return {
            title: "Project Not Found",
            description: "The link you followed is invalid, expired, or deleted.",
        }
    }

    const vendorLabel = (pageData.seo.vendorName || tenant.name || "Fastpik").trim()
    const clientName = (pageData.config.clientName || "").trim()
    const fallbackTitle = clientName
        ? `Galeri Foto ${clientName} | ${vendorLabel}`
        : `Galeri Klien | ${vendorLabel}`
    const fallbackDescription = `Lihat dan pilih foto Anda dengan mudah di ${vendorLabel}.`

    const variables: Record<string, string> = {
        vendor_name: vendorLabel,
        studio_name: vendorLabel,
        tenant_name: (tenant.name || "Fastpik").trim(),
        client_name: clientName,
        project_id: (pageData.config.id || pageData.projectId || "").toString(),
        locale: locale || "id",
    }

    const title = renderSeoText(pageData.seo.metaTitle, variables, fallbackTitle)
    const description = renderSeoText(pageData.seo.metaDescription, variables, fallbackDescription)
    const keywords = parseSeoKeywords(pageData.seo.metaKeywords)
    const imageUrl = pickSeoImage(pageData.seo.avatarUrl, tenant.logoUrl)

    const metadata: Metadata = {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
            images: [{ url: imageUrl }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
    }

    if (keywords.length > 0) {
        metadata.keywords = keywords
    }

    return metadata
}

export default async function ClientPage({ params }: { params: Promise<ClientPageParams> }) {
    const { slug } = await params
    const pageData = await resolveClientPageData(slug)

    if (!pageData.config) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-red-500">Project Not Found</h1>
                    <p className="text-muted-foreground">The link you followed is invalid, expired, or deleted.</p>
                </div>
            </div>
        )
    }

    // Strip password from config before sending to client — verify server-side only
    const { password: _password, ...safeConfig } = pageData.config
    const projectType: "edit" | "print" = safeConfig.projectType === "print" ? "print" : "edit"
    const clientConfig = {
        clientName: typeof safeConfig.clientName === "string" ? safeConfig.clientName : "",
        maxPhotos: typeof safeConfig.maxPhotos === "number" && Number.isFinite(safeConfig.maxPhotos) ? safeConfig.maxPhotos : null,
        adminWhatsapp: typeof safeConfig.adminWhatsapp === "string" ? safeConfig.adminWhatsapp : "",
        gdriveLink: typeof safeConfig.gdriveLink === "string" ? safeConfig.gdriveLink : "",
        detectSubfolders: Boolean(safeConfig.detectSubfolders),
        expiresAt: toOptionalNumber(safeConfig.expiresAt),
        downloadExpiresAt: toOptionalNumber(safeConfig.downloadExpiresAt),
        selectionEnabled: safeConfig.selectionEnabled !== false,
        downloadEnabled: safeConfig.downloadEnabled !== false,
        lockedPhotos: toStringArray(safeConfig.lockedPhotos),
        selectedPhotos: toStringArray(safeConfig.selectedPhotos),
        selectionStatus: typeof safeConfig.selectionStatus === "string" ? safeConfig.selectionStatus : undefined,
        extraEnabled: typeof safeConfig.extraEnabled === "boolean" ? safeConfig.extraEnabled : undefined,
        extraMaxPhotos: toOptionalNumber(safeConfig.extraMaxPhotos),
        extraExpiresAt: toOptionalNumber(safeConfig.extraExpiresAt),
        extraSelectedPhotos: toStringArray(safeConfig.extraSelectedPhotos),
        extraStatus: typeof safeConfig.extraStatus === "string" ? safeConfig.extraStatus : undefined,
        projectType,
        printEnabled: typeof safeConfig.printEnabled === "boolean" ? safeConfig.printEnabled : undefined,
        printExpiresAt: toOptionalNumber(safeConfig.printExpiresAt),
        printSizes: toPrintSizes(safeConfig.printSizes),
        printStatus: typeof safeConfig.printStatus === "string" ? safeConfig.printStatus : undefined,
        printSelections: toPrintSelections(safeConfig.printSelections),
        hasPassword: !!_password,
        projectId: pageData.config.id || pageData.projectId,
    }

    return (
        <ClientView
            config={clientConfig}
            messageTemplates={pageData.templates}
            customChooseActionText={pageData.chooseActionText}
        />
    )
}
