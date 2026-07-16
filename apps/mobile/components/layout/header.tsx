import { clsx } from "clsx"
import { View, type ViewProps } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/ui/text"

type HeaderProps = ViewProps & {
  title: string
  subtitle?: string
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
}

export function Header({ title, subtitle, leftAction, rightAction, className, ...props }: HeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className={clsx(
        "flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800",
        className
      )}
      style={{ paddingTop: insets.top }}
      {...props}
    >
      <View className="w-10 flex-row items-center">
        {leftAction}
      </View>

      <View className="flex-1 items-center">
        <Text variant="h3">{title}</Text>
        {subtitle && <Text variant="caption">{subtitle}</Text>}
      </View>

      <View className="w-10 flex-row items-center justify-end">
        {rightAction}
      </View>
    </View>
  )
}
