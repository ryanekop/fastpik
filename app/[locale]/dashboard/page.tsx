
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { getProjects } from "@/lib/supabase/projects"
import { AdminShell } from "@/components/admin/admin-shell"
import { ProjectListWrapper } from "@/components/admin/project-list-wrapper"
import { Loader2 } from "lucide-react"
import { Metadata } from "next"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: "Dashboard"
}

import { getLatestChangelog } from "@/lib/supabase/changelogs"
import { getLocale } from "next-intl/server"

export default async function DashboardPage() {
    const t = await getTranslations('Admin')
    const locale = await getLocale()
    const projects = await getProjects()
    const latestChangelog = await getLatestChangelog(locale)

    return (
        <AdminShell latestChangelog={latestChangelog}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('dashboardTitle')}</h1>
                    <p className="text-muted-foreground">
                        {t('dashboardDescription')}
                    </p>
                </div>

                <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                    <ProjectListWrapper initialProjects={projects} />
                </Suspense>

                <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
                    <p>
                        {t('footer')} <a href="https://instagram.com/ryanekopram" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekopram</a> & <a href="https://instagram.com/ryaneko.apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryaneko.apps</a>
                        <span className="mx-2 text-muted-foreground/50">•</span>
                        <a href={`/${locale}/dashboard/changelog`} className="text-muted-foreground hover:text-primary transition-colors text-xs">{t('changelog')} v{latestChangelog?.version || '1.0.0'}</a>
                    </p>
                </div>
            </div>
        </AdminShell>
    )
}
