import { redirect } from "next/navigation"

type Props = {
    params: Promise<{ locale: string; id: string }>
}

export default async function DashboardProjectEditPage({ params }: Props) {
    const { locale, id } = await params
    const safeLocale = (locale || "id").trim() || "id"
    const safeId = (id || "").trim()

    if (!safeId) {
        redirect(`/${safeLocale}/dashboard`)
    }

    redirect(`/${safeLocale}/dashboard?edit=${encodeURIComponent(safeId)}`)
}
