import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, ArrowRight } from "lucide-react"

// Client components (these have "use client" directive, so they'll hydrate on the client)
import { LandingNav, HeroCTA, BottomCTA } from "@/components/landing/landing-client"
import { AnimatedHero, AnimatedFeatures, AnimatedWorkflow, AnimatedSection, AnimatedCTA } from "@/components/landing/landing-animations"

export default async function Home() {
  const t = await getTranslations('Index')
  const locale = await getLocale()

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      {/* Header — server rendered shell + client nav */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <Link href={`/${locale}`} className="font-bold text-xl tracking-tight flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src="/fastpik-logo.png" alt="Fastpik" width={28} height={28} className="rounded-md" />
          Fastpik
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <LandingNav />
        </div>
      </header>

      {/* Hero Section — SSR content with animated wrapper */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background py-20 sm:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        <div className="container mx-auto px-4">
          <AnimatedHero>
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              {t('heroTagline')}
            </Badge>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
              {t('title')}
              <span className="block text-primary mt-2">{t('subtitle')}</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('description')}
            </p>

            <HeroCTA />

            <p className="text-sm text-muted-foreground pt-4">
              ✨ {t('trustedBy')}
            </p>
          </AnimatedHero>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <AnimatedFeatures />

          <AnimatedSection className="text-center mt-10">
            <Button variant="outline" size="lg" asChild className="gap-2">
              <Link href={`/${locale}/features`}>
                ✨ {t('seeAllFeatures')} <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedWorkflow />
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('pricingTitle')}</h2>
            <p className="text-muted-foreground text-lg mb-8">{t('pricingSubtitle')}</p>

            <Button size="lg" variant="outline" asChild className="gap-2">
              <Link href={`/${locale}/pricing`}>
                👀 {t('pricingCta')} <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedCTA>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('ctaTitle')}</h2>
            <p className="text-primary-foreground/80 text-lg mb-8">{t('ctaSubtitle')}</p>
            <BottomCTA />
          </AnimatedCTA>
        </div>
      </section>

      {/* Footer — pure SSR */}
      <footer className="py-8 border-t text-center text-sm text-muted-foreground">
        <p>
          {t('footerMadeWith')} <a href="https://instagram.com/ryanekopram" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekopram</a> & <a href="https://instagram.com/ryanekoapps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@ryanekoapps</a>
        </p>
      </footer>
    </div>
  )
}
