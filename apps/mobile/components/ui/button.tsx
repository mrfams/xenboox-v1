import { cva, type VariantProps } from "class-variance-authority"
import { clsx } from "clsx"
import { Text as RNText, TouchableOpacity, type TouchableOpacityProps, ActivityIndicator } from "react-native"

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-lg",
  {
    variants: {
      variant: {
        primary: "bg-primary-600 active:bg-primary-700",
        secondary: "bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700",
        outline: "border border-slate-300 bg-transparent active:bg-slate-50 dark:border-slate-600 dark:active:bg-slate-800",
        danger: "bg-danger active:bg-red-600",
        ghost: "bg-transparent active:bg-slate-100 dark:active:bg-slate-800"
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6",
        xl: "h-14 px-8"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
)

const textVariants = cva("font-medium", {
  variants: {
    variant: {
      primary: "text-white",
      secondary: "text-slate-900 dark:text-slate-100",
      outline: "text-slate-900 dark:text-slate-100",
      danger: "text-white",
      ghost: "text-slate-900 dark:text-slate-100"
    },
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
      xl: "text-xl"
    }
  },
  defaultVariants: {
    variant: "primary",
    size: "md"
  }
})

type ButtonProps = TouchableOpacityProps &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
    icon?: React.ReactNode
  }

export function Button({
  variant,
  size,
  loading,
  icon,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={clsx(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "primary" || variant === "danger" ? "#ffffff" : "#2563eb"} />
      ) : (
        <>
          {icon}
          {children && (
            <RNText className={clsx(textVariants({ variant, size }), icon ? "ml-2" : "")}>
              {children}
            </RNText>
          )}
        </>
      )}
    </TouchableOpacity>
  )
}
