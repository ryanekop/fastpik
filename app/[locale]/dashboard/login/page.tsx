
import { LoginForm } from "@/components/admin/login-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: Props) {
    const params = await searchParams
    const paymentSuccess = params.payment_success === 'true'

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm space-y-4">
                {paymentSuccess && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-900/10">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle className="text-green-600 dark:text-green-400">Pembayaran Berhasil!</AlertTitle>
                        <AlertDescription className="text-green-600/90 dark:text-green-400/90">
                            Silakan cek email Anda untuk mendapatkan link password akun Pro Anda.
                        </AlertDescription>
                    </Alert>
                )}
                <LoginForm />
            </div>
        </div>
    )
}
