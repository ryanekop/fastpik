"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { Loader2, Send, CheckCircle, XCircle, ArrowLeft, Zap, Star, Crown, Sparkles, Lock, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'

const PLANS = [
    { id: 'monthly', name: 'Pro Monthly', amount: 15000, icon: Zap, color: 'text-blue-500' },
    { id: 'quarterly', name: 'Pro Quarterly', amount: 39000, icon: Star, color: 'text-purple-500' },
    { id: 'yearly', name: 'Pro Yearly', amount: 129000, icon: Crown, color: 'text-orange-500' },
    { id: 'lifetime', name: 'Pro Lifetime', amount: 349000, icon: Sparkles, color: 'text-amber-500' },
]

// Secret key for webhook tester access (same as admin-secret)
const SECRET_KEY = "fastpik-ryan-2024-secret"

export default function WebhookTesterPage() {
    const locale = useLocale()

    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [secretInput, setSecretInput] = useState('')
    const [authError, setAuthError] = useState('')

    // Check if already authenticated (from session storage)
    useEffect(() => {
        const stored = sessionStorage.getItem('webhook-tester-auth')
        if (stored === 'true') {
            setIsAuthenticated(true)
        }
    }, [])

    const handleAuth = () => {
        if (secretInput === SECRET_KEY) {
            setIsAuthenticated(true)
            sessionStorage.setItem('webhook-tester-auth', 'true')
            setAuthError('')
        } else {
            setAuthError('❌ Invalid secret key')
        }
    }

    const [email, setEmail] = useState('')
    const [name, setName] = useState('Test User')
    const [selectedPlan, setSelectedPlan] = useState('monthly')
    const [status, setStatus] = useState('success')
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<{ success: boolean; data: any } | null>(null)
    const [payload, setPayload] = useState('')

    const selectedPlanData = PLANS.find(p => p.id === selectedPlan) || PLANS[0]

    const generatePayload = () => {
        const transactionId = `TRX-${Date.now()}-TEST`
        const data = {
            id: transactionId,
            transaction_id: transactionId,
            status: status,
            transaction_status: status === 'success' ? 'settlement' : status,
            amount: selectedPlanData.amount,
            gross_amount: selectedPlanData.amount,
            customer: {
                name: name,
                email: email
            },
            created_at: new Date().toISOString(),
            payment_method: "webhook_tester"
        }
        setPayload(JSON.stringify(data, null, 2))
        return data
    }

    const sendWebhook = async () => {
        if (!email) {
            alert('Email is required!')
            return
        }

        setLoading(true)
        setResponse(null)

        try {
            const payloadData = generatePayload()

            const res = await fetch('/api/webhooks/mayar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payloadData)
            })

            const data = await res.json()
            setResponse({
                success: res.ok,
                data: { status: res.status, ...data }
            })
        } catch (error: any) {
            setResponse({
                success: false,
                data: { error: error.message }
            })
        } finally {
            setLoading(false)
        }
    }

    // Show authentication screen if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">🔐 Webhook Tester</CardTitle>
                        <CardDescription>Masukkan secret key untuk mengakses</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="secret">🔑 Secret Key</Label>
                            <Input
                                id="secret"
                                type="password"
                                value={secretInput}
                                onChange={(e) => setSecretInput(e.target.value)}
                                placeholder="Masukkan secret key..."
                                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                            />
                            {authError && (
                                <p className="text-sm text-red-500">{authError}</p>
                            )}
                        </div>
                        <Button onClick={handleAuth} className="w-full gap-2">
                            <KeyRound className="h-4 w-4" />
                            Unlock
                        </Button>
                        <div className="text-center">
                            <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-primary">
                                ← Kembali ke Home
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
            <header className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
                <Link href={`/${locale}/admin-secret`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Admin
                </Link>
                <div className="flex items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">🧪 Webhook Tester</h1>
                    <p className="text-muted-foreground">Test Mayar webhook integration for subscriptions</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Send className="h-5 w-5" />
                                Configuration
                            </CardTitle>
                            <CardDescription>Set up webhook test parameters</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Customer Info */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Customer Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="customer@example.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Customer Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Customer Name"
                                />
                            </div>

                            {/* Plan Selection */}
                            <div className="space-y-2">
                                <Label>Select Plan</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PLANS.map((plan) => {
                                        const Icon = plan.icon
                                        return (
                                            <button
                                                key={plan.id}
                                                onClick={() => setSelectedPlan(plan.id)}
                                                className={`p-3 rounded-lg border-2 text-left transition-all ${selectedPlan === plan.id
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-muted-foreground/50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`h-4 w-4 ${plan.color}`} />
                                                    <span className="font-medium text-sm">{plan.name}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Rp {plan.amount.toLocaleString('id-ID')}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label>Transaction Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="success">✅ success</SelectItem>
                                        <SelectItem value="settlement">✅ settlement</SelectItem>
                                        <SelectItem value="pending">⏳ pending</SelectItem>
                                        <SelectItem value="failed">❌ failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={generatePayload}
                                    className="flex-1"
                                >
                                    Preview Payload
                                </Button>
                                <Button
                                    onClick={sendWebhook}
                                    disabled={loading || !email}
                                    className="flex-1"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    Send Webhook
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Response */}
                    <div className="space-y-4">
                        {/* Payload Preview */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">📦 Payload Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={payload}
                                    readOnly
                                    className="font-mono text-xs h-48"
                                    placeholder="Click 'Preview Payload' to see the JSON..."
                                />
                            </CardContent>
                        </Card>

                        {/* Response */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    📬 Response
                                    {response && (
                                        <Badge variant={response.success ? "default" : "destructive"}>
                                            {response.success ? (
                                                <><CheckCircle className="h-3 w-3 mr-1" /> Success</>
                                            ) : (
                                                <><XCircle className="h-3 w-3 mr-1" /> Error</>
                                            )}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`font-mono text-xs p-3 rounded-md min-h-[100px] ${response?.success
                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                    : response
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {response
                                        ? JSON.stringify(response.data, null, 2)
                                        : 'Waiting for webhook test...'
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
