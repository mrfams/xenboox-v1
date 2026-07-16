import { clsx } from "clsx"
import { Text as RNText, type TextProps } from "react-native"

type TextVariant = "h1" | "h2" | "h3" | "body" | "bodySmall" | "caption" | "label"

const variantClasses: Record<TextVariant, string> = {
  h1: "text-3xl font-bold text-slate-900 dark:text-slate-50",
  h2: "text-2xl font-bold text-slate-900 dark:text-slate-50",
  h3: "text-xl font-semibold text-slate-900 dark:text-slate-50",
  body: "text-base text-slate-900 dark:text-slate-100",
  bodySmall: "text-sm text-slate-900 dark:text-slate-100",
  caption: "text-xs text-slate-500 dark:text-slate-400",
  label: "text-sm font-medium text-slate-700 dark:text-slate-300"
}

type XenbooxTextProps = TextProps & {
  variant?: TextVariant
}

export function Text({ variant = "body", className, ...props }: XenbooxTextProps) {
  return (
    <RNText
      className={clsx(variantClasses[variant], className)}
      {...props}
    />
  )
}
