import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const verifyMutation = trpc.auth.verifyEmail.useMutation();

  async function handleVerify() {
    const t = (token ?? manualToken).trim();
    if (!t) {
      setError("Enter the verification code from your email");
      return;
    }

    setError("");
    try {
      await verifyMutation.mutateAsync({ token: t });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 bg-white dark:bg-slate-900">
          <View className="mb-8">
            <Text variant="h1" className="mb-2">
              Verify your email
            </Text>
            <Text variant="body" className="text-slate-500">
              Enter the verification code we emailed you to activate your
              account.
            </Text>
          </View>

          {done ? (
            <View className="gap-4">
              <Text variant="body" className="text-success">
                Email verified. You're all set.
              </Text>
              <Link href="/(auth)/login" asChild>
                <Button>Go to sign in</Button>
              </Link>
            </View>
          ) : (
            <View className="gap-1">
              {!token ? (
                <Input
                  label="Verification code"
                  placeholder="Paste the code from your email"
                  value={manualToken}
                  onChangeText={setManualToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : null}

              {error ? (
                <Text variant="caption" className="mb-2 text-danger">
                  {error}
                </Text>
              ) : null}

              <Button
                onPress={handleVerify}
                loading={verifyMutation.isPending}
                className="mt-2"
              >
                Verify email
              </Button>

              <View className="mt-6 items-center">
                <Link href="/(auth)/login" asChild>
                  <Button variant="ghost" size="sm">
                    Back to sign in
                  </Button>
                </Link>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
