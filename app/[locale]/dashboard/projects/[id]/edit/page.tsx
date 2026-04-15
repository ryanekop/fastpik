import { redirect } from "next/navigation"

type Props = {
    params: Promise<{ locale: string; id: string }>
    searchParams: Promise<{ focus?: string | string[] | undefined }>
}

export default async function DashboardProjectEditPage({ params, searchParams }: Props) {
    const { locale, id } = await params
    const query = await searchParams
    const safeLocale = (locale || "id").trim() || "id"
    const safeId = (id || "").trim()
    const focusRaw = Array.isArray(query.focus) ? query.focus[0] : query.focus
    const safeFocus = focusRaw === 'extra' || focusRaw === 'print' ? focusRaw : ''

    if (!safeId) {
        redirect(`/${safeLocale}/dashboard`)
    }

    const nextQuery = new URLSearchParams({ edit: safeId })
    if (safeFocus) nextQuery.set('focus', safeFocus)
    redirect(`/${safeLocale}/dashboard?${nextQuery.toString()}`)
}
