'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function WebhookTesterPage() {
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [amount, setAmount] = useState('15000')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<string | null>(null)

    const plans = [
        { label: '1 Bulan (Rp 15.000)', value: '15000' },
        { label: '3 Bulan (Rp 39.000)', value: '39000' },
        { label: '1 Tahun (Rp 129.000)', value: '129000' },
        { label: 'Lifetime (Rp 349.000)', value: '349000' },
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setResult(null)

        try {
            const response = await fetch('/api/webhooks/mayar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'success',
                    transaction_status: 'settlement',
                    amount: parseInt(amount),
                    id: `TEST-${Date.now()}`,
                    customer: {
                        email: email,
                        name: name,
                    }
                }),
            })

            const data = await response.json()
            setResult(`Status: ${response.status}\n${JSON.stringify(data, null, 2)}`)
        } catch (error: any) {
            setResult(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
                    🧪 Webhook Tester
                </h1>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">
                    Simulasi pembayaran Mayar untuk testing
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email Pelanggan
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="customer@example.com"
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Nama Pelanggan
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="John Doe"
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Paket Langganan
                        </label>
                        <select
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        >
                            {plans.map((plan) => (
                                <option key={plan.value} value={plan.value}>
                                    {plan.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? '⏳ Mengirim...' : '🚀 Simulasi Pembayaran'}
                    </button>
                </form>

                {result && (
                    <div className="mt-6">
                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Hasil:
                        </h3>
                        <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg text-xs overflow-auto max-h-48 text-slate-800 dark:text-slate-200">
                            {result}
                        </pre>
                    </div>
                )}

                <p className="mt-6 text-xs text-center text-slate-400">
                    ⚠️ Halaman ini hanya untuk testing. <br />
                    Jangan gunakan di production.
                </p>
            </div>
        </div>
    )
}
