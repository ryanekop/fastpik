"use client"

import { useTranslations, useLocale } from "next-intl"
import { AdminShell } from "@/components/admin/admin-shell"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Globe, Tag, Link2, BarChart3, Palette, Shield, Briefcase, ExternalLink, Check, X } from "lucide-react"
import Link from "next/link"

export default function CustomDomainPage() {
    const t = useTranslations('Admin')
    const locale = useLocale()

    const benefits = [
        { icon: Tag, color: 'text-blue-500 bg-blue-500/10', title: t('domainPage.brandTitle'), desc: t('domainPage.brandDesc') },
        { icon: Link2, color: 'text-green-500 bg-green-500/10', title: t('domainPage.urlTitle'), desc: t('domainPage.urlDesc') },
        { icon: BarChart3, color: 'text-amber-500 bg-amber-500/10', title: t('domainPage.seoTitle'), desc: t('domainPage.seoDesc') },
        { icon: Palette, color: 'text-purple-500 bg-purple-500/10', title: t('domainPage.customTitle'), desc: t('domainPage.customDesc') },
        { icon: Shield, color: 'text-teal-500 bg-teal-500/10', title: t('domainPage.separateTitle'), desc: t('domainPage.separateDesc') },
        { icon: Briefcase, color: 'text-rose-500 bg-rose-500/10', title: t('domainPage.proTitle'), desc: t('domainPage.proDesc') },
    ]

    const comparison = [
        { feature: t('domainPage.compUrl'), without: 'fastpik.ryanekoapp.web.id/id/client/...', with: 'gallery.namamu.com/id/client/...' },
        { feature: t('domainPage.compBrand'), without: '❌', with: '✅' },
        { feature: t('domainPage.compLogo'), without: '❌', with: '✅' },
        { feature: t('domainPage.compTrust'), without: t('domainPage.compTrustLow'), with: t('domainPage.compTrustHigh') },
        { feature: t('domainPage.compSeo'), without: '❌', with: '✅' },
    ]

    return (
        <AdminShell>
            <div className="max-w-3xl mx-auto space-y-8 pb-10">
                {/* Back */}
                <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToList')}
                </Link>

                {/* Hero */}
                <div className="text-center space-y-4 animate-[fade-in-up_0.6s_ease-out]">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-foreground shadow-xl mx-auto animate-[bounce-in_0.6s_ease-out]">
                        <Globe className="h-10 w-10 text-background" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        {t('domainPage.heroTitle')}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        {t('domainPage.heroDesc')}
                    </p>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {benefits.map((b, i) => (
                        <Card
                            key={i}
                            className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-[fade-in-up_0.5s_ease-out_both]"
                            style={{ animationDelay: `${i * 80 + 200}ms` }}
                        >
                            <CardContent className="p-5 space-y-3">
                                <div className={`w-10 h-10 rounded-xl ${b.color} flex items-center justify-center`}>
                                    <b.icon className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-sm">{b.title}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Comparison Table */}
                <div className="space-y-4 animate-[fade-in-up_0.5s_ease-out_0.8s_both]">
                    <h2 className="text-xl font-bold text-center">{t('domainPage.compTitle')}</h2>
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/50">
                                    <th className="text-left p-3 font-medium text-muted-foreground">{t('domainPage.compFeature')}</th>
                                    <th className="text-center p-3 font-medium text-red-500">
                                        <div className="flex items-center justify-center gap-1">
                                            <X className="h-4 w-4" /> {t('domainPage.compWithout')}
                                        </div>
                                    </th>
                                    <th className="text-center p-3 font-medium text-green-500">
                                        <div className="flex items-center justify-center gap-1">
                                            <Check className="h-4 w-4" /> {t('domainPage.compWith')}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparison.map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                        <td className="p-3 font-medium">{row.feature}</td>
                                        <td className="p-3 text-center text-muted-foreground text-xs">{row.without}</td>
                                        <td className="p-3 text-center text-xs font-medium">{row.with}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4 animate-[fade-in-up_0.5s_ease-out_1s_both]">
                    <h2 className="text-xl font-bold text-center">{t('domainPage.pricingTitle')}</h2>
                    <Card className="overflow-hidden border-2 border-foreground/20 hover:border-foreground/40 transition-colors duration-300">
                        <CardContent className="p-0">
                            <div className="bg-foreground p-6 text-background text-center">
                                <p className="text-sm opacity-80 mb-2">{t('domainPage.pricingSetup')}</p>
                                <p className="text-lg opacity-60 line-through">Rp 200.000</p>
                                <p className="text-4xl font-bold">Rp 150.000</p>
                                <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-full animate-pulse">🔥 10 orang tercepat</span>
                                <p className="text-sm opacity-70 mt-2">{t('domainPage.pricingOneTime')}</p>
                                <p className="text-sm font-semibold opacity-95 mt-1">{t('domainPage.pricingAppliesBoth')}</p>
                            </div>
                            <div className="p-6 space-y-3">
                                <div className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">{t('domainPage.pricingInc1')}</p>
                                        <p className="text-xs text-muted-foreground">{t('domainPage.pricingInc1Desc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">{t('domainPage.pricingInc2')}</p>
                                        <p className="text-xs text-muted-foreground">{t('domainPage.pricingInc2Desc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">{t('domainPage.pricingInc3')}</p>
                                        <p className="text-xs text-muted-foreground">{t('domainPage.pricingInc3Desc')}</p>
                                    </div>
                                </div>
                                <div className="rounded-lg bg-muted border p-3 text-sm flex gap-2">
                                    <span className="shrink-0">💡</span>
                                    <p className="text-muted-foreground">{t('domainPage.pricingDomainNote')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CTA */}
                <div className="text-center space-y-4 pt-4 animate-[fade-in-up_0.5s_ease-out_1.2s_both]">
                    <h2 className="text-xl font-bold">{t('domainPage.ctaTitle')}</h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">{t('domainPage.ctaDesc')}</p>
                    <a
                        href="https://instagram.com/ryanekoapps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-semibold hover:opacity-90 transition-all active:scale-95"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        {t('domainPage.ctaButton')}
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>

                <style jsx global>{`
                    @keyframes fade-in-up {
                        from { opacity: 0; transform: translateY(16px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes bounce-in {
                        0% { opacity: 0; transform: scale(0.3); }
                        50% { transform: scale(1.05); }
                        70% { transform: scale(0.95); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </div>
        </AdminShell>
    )
}
