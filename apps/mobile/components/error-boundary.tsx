import React from "react"
import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent } from "@/components/ui/card"

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-slate-50 p-8 dark:bg-slate-900">
          <Card variant="elevated">
            <CardContent>
              <View className="items-center gap-4">
                <Text variant="h2">Oops!</Text>
                <Text variant="body" className="text-center text-slate-500">
                  {this.state.error?.message || "Something went wrong."}
                </Text>
                <Text
                  variant="body"
                  className="text-primary-600 font-medium"
                  onPress={() => this.setState({ hasError: false, error: null })}
                >
                  Tap to retry
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>
      )
    }

    return this.props.children
  }
}