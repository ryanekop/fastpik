
import { getChangelogs } from "@/lib/supabase/changelogs"
import { AdminShell } from "@/components/admin/admin-shell"
import { getTranslations, getLocale } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Rocket, Sparkles, Wrench, Calendar } from "lucide-react"

export const metadata = {
    title: "Changelog"
}

export default async function ChangelogPage() {
    const t = await getTranslations('Admin')
    const locale = await getLocale()
    const changelogs = await getChangelogs(locale)

    const getIcon = (category: string) => {
        const catLower = category.toLowerCase()
        if (catLower.includes('feature') || catLower.includes('fitur') || catLower.includes('new') || catLower.includes('release') || catLower.includes('rilis')) return <Sparkles className="h-5 w-5 text-amber-500" />
        if (catLower.includes('fix') || catLower.includes('perbaikan')) return <Wrench className="h-5 w-5 text-blue-500" />
        return <Rocket className="h-5 w-5 text-green-500" />
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
            <div className="space-y-6 max-w-3xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{t('changelog')}</h1>
                    <p className="text-muted-foreground">
                        {t('seeFullChangelog')}
                    </p>
                </div>

                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {changelogs.map((log, index) => (
                        <div key={log.id} className="relative flex items-start md:justify-center group">
                            {/* Version Badge (Timeline Node) */}
                            <div className="absolute left-0.5 -translate-x-1/2 mt-1 md:left-1/2 md:mt-1 h-9 w-9 rounded-full border-4 border-background bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-sm z-10">
                                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                            </div>

                            {/* Content Card */}
                            <div className="ml-10 md:ml-0 md:w-1/2 md:group-odd:pr-10 md:group-even:pl-10 md:group-even:ml-auto w-full">
                                <Card className="border-t-4 border-t-primary shadow-md hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                                    v{log.version}
                                                    {index === 0 && <Badge className="bg-green-500 hover:bg-green-600">Latest</Badge>}
                                                </CardTitle>
                                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                    <Calendar className="mr-1 h-3 w-3" />
                                                    {formatDate(log.releaseDate)}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        {log.changes.map((group, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <h4 className="font-medium text-sm flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                                                    {getIcon(group.category)}
                                                    {group.category}
                                                </h4>
                                                <ul className="space-y-2 pl-1">
                                                    {group.items.map((item, itemIdx) => (
                                                        <li key={itemIdx} className="text-sm flex items-start gap-2.5 leading-relaxed text-foreground/90">
                                                            <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AdminShell>
    )
}
