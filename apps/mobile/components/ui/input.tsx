import { clsx } from "clsx"
import { TextInput as RNTextInput, type TextInputProps, View, Text } from "react-native"

type InputProps = TextInputProps & {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Text>
      )}
      <RNTextInput
        className={clsx(
          "h-11 rounded-lg border bg-white px-3 text-base text-slate-900 dark:bg-slate-800 dark:text-slate-100",
          error
            ? "border-danger"
            : "border-slate-300 dark:border-slate-600",
          props.editable === false && "bg-slate-50 opacity-60 dark:bg-slate-900",
          className
        )}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error && (
        <Text className="mt-1 text-xs text-danger">{error}</Text>
      )}
      {hint && !error && (
        <Text className="mt-1 text-xs text-slate-500">{hint}</Text>
      )}
    </View>
  )
}

export function PasswordInput(props: Omit<InputProps, "secureTextEntry">) {
  return <Input {...props} secureTextEntry textContentType="password" />
}
