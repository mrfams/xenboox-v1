import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const resetMutation = trpc.auth.resetPassword.useMutation();

  async function handleSubmit() {
    if (!token) {
      setError("Missing reset token — open the link from your email");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    try {
      await resetMutation.mutateAsync({ token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
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
              Set new password
            </Text>
            <Text variant="body" className="text-slate-500">
              Choose a new password for your account.
            </Text>
          </View>

          {done ? (
            <View className="gap-4">
              <Text variant="body" className="text-success">
                Password updated. You can now sign in with your new password.
              </Text>
              <Link href="/(auth)/login" asChild>
                <Button>Go to sign in</Button>
              </Link>
            </View>
          ) : (
            <View className="gap-1">
              <Input
                label="New password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <Input
                label="Confirm password"
                placeholder="Repeat your password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
              />

              {error ? (
                <Text variant="caption" className="mb-2 text-danger">
                  {error}
                </Text>
              ) : null}

              <Button
                onPress={handleSubmit}
                loading={resetMutation.isPending}
                className="mt-2"
              >
                Update password
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
