import { cva, type VariantProps } from "class-variance-authority"
import { clsx } from "clsx"
import { View, type ViewProps } from "react-native"

const cardVariants = cva("rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800", {
  variants: {
    variant: {
      default: "",
      elevated: "shadow-sm",
      outlined: "border-slate-300 dark:border-slate-600",
      interactive: "active:bg-slate-50 dark:active:bg-slate-700"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

type CardProps = ViewProps & VariantProps<typeof cardVariants>

export function Card({ variant, className, ...props }: CardProps) {
  return <View className={clsx(cardVariants({ variant, className }))} {...props} />
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={clsx("mb-3 flex-row items-center justify-between", className)} {...props} />
}

export function CardTitle({ className, ...props }: ViewProps) {
  return <View className={clsx("flex-1", className)} {...props} />
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={clsx("", className)} {...props} />
}

export function CardFooter({ className, ...props }: ViewProps) {
  return <View className={clsx("mt-3 flex-row items-center justify-end gap-2", className)} {...props} />
}
