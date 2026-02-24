"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { FolderOpen, PenLine, Clock, Search, BellOff, DollarSign } from "lucide-react"

const problems = [
    { key: "1", icon: FolderOpen, color: "text-red-500", bg: "bg-red-500/10" },
    { key: "2", icon: PenLine, color: "text-orange-500", bg: "bg-orange-500/10" },
    { key: "3", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { key: "4", icon: Search, color: "text-blue-500", bg: "bg-blue-500/10" },
    { key: "5", icon: BellOff, color: "text-purple-500", bg: "bg-purple-500/10" },
    { key: "6", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
]

export function ProblemSection() {
    const t = useTranslations("Index")

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
            >
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    😩 {t("problemTitle")}
                </h2>
                <p className="text-muted-foreground text-lg">
                    {t("problemSubtitle")}
                </p>
            </motion.div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {problems.map((problem, index) => {
                    const Icon = problem.icon
                    return (
                        <motion.div
                            key={problem.key}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.08 }}
                            className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-md transition-shadow"
                        >
                            <div className={`h-10 w-10 rounded-lg ${problem.bg} flex items-center justify-center`}>
                                <Icon className={`h-5 w-5 ${problem.color}`} />
                            </div>
                            <h3 className="font-semibold text-base">
                                {t(`problem${problem.key}Title` as any)}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t(`problem${problem.key}Desc` as any)}
                            </p>
                        </motion.div>
                    )
                })}
            </div>
        </>
    )
}
