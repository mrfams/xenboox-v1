import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const resetMutation = trpc.auth.requestPasswordReset.useMutation();

  async function handleSubmit() {
    if (!email) {
      setError("Enter your account email");
      return;
    }

    setError("");
    try {
      const result = await resetMutation.mutateAsync({ email });
      // Server always returns the same message whether or not the account
      // exists (no account enumeration). Surface it verbatim.
      setSent(true);
      setError(result?.message ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
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
              Reset password
            </Text>
            <Text variant="body" className="text-slate-500">
              Enter your account email and we'll send a reset link.
            </Text>
          </View>

          <View className="gap-1">
            <Input
              label="Email"
              placeholder="you@company.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            {error ? (
              <Text variant="caption" className="mb-2 text-danger">
                {error}
              </Text>
            ) : null}

            {sent ? (
              <Text variant="caption" className="mb-2 text-success">
                {error && error.length > 0
                  ? error
                  : "If the email exists, a reset link has been sent."}
              </Text>
            ) : null}

            <Button
              onPress={handleSubmit}
              loading={resetMutation.isPending}
              className="mt-2"
            >
              Send reset link
            </Button>

            <View className="mt-6 items-center">
              <Link href="/(auth)/login" asChild>
                <Button variant="ghost" size="sm">
                  Back to sign in
                </Button>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
