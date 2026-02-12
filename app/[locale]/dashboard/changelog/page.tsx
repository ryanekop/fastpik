
import { getChangelogs } from "@/lib/supabase/changelogs"
import { AdminShell } from "@/components/admin/admin-shell"
import { getTranslations, getLocale } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sparkles, Wrench, Rocket, Calendar } from "lucide-react"

export const metadata = {
    title: "Changelog"
}

export default async function ChangelogPage() {
    const t = await getTranslations('Admin')
    const locale = await getLocale()
    const changelogs = await getChangelogs(locale)

    const getIcon = (category: string) => {
        const catLower = category.toLowerCase()
        if (catLower.includes('feature') || catLower.includes('fitur') || catLower.includes('release') || catLower.includes('rilis')) return <Sparkles className="h-4 w-4 text-amber-500" />
        if (catLower.includes('fix') || catLower.includes('perbaikan')) return <Wrench className="h-4 w-4 text-blue-500" />
        if (catLower.includes('improvement') || catLower.includes('peningkatan')) return <Rocket className="h-4 w-4 text-green-500" />
        return <Rocket className="h-4 w-4 text-green-500" />
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <AdminShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">{t('changelog')}</h1>
                    <p className="text-muted-foreground text-sm">{t('seeFullChangelog')}</p>
                </div>

                <div className="space-y-4">
                    {changelogs.map((log, index) => (
                        <Card key={log.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold">v{log.version}</span>
                                    {index === 0 && <Badge className="bg-green-500 hover:bg-green-600 text-xs">Latest</Badge>}
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <Calendar className="mr-1 h-3 w-3" />
                                    {formatDate(log.releaseDate)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                {log.changes.map((group, idx) => (
                                    <div key={idx}>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                                            {getIcon(group.category)}
                                            {group.category}
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {group.items.map((item, itemIdx) => (
                                                <li key={itemIdx} className="text-sm flex items-start gap-2 text-foreground/90">
                                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AdminShell>
    )
}
