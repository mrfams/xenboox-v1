import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"

interface ErrorComponentProps {
  message?: string
  onRetry?: () => void
}

export function ErrorComponent({ message = "Something went wrong.", onRetry }: ErrorComponentProps) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text variant="h3" className="mb-2 text-danger">
        Error
      </Text>
      <Text variant="bodySmall" className="mb-6 text-center text-slate-500">
        {message}
      </Text>
      {onRetry && <Button onPress={onRetry}>Retry</Button>}
    </View>
  )
}
