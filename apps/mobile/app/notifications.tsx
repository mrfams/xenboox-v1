import { View, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Bell, CheckCheck, ChevronLeft } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { useNotifications } from "@/lib/notifications";
import { useState, useCallback } from "react";
import { clsx } from "clsx";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // The provider refetches on foreground; here we just clear the spinner
    // after a beat so pull-to-refresh feels responsive.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setRefreshing(false);
  }, []);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="Notifications"
        leftAction={
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color="#2563eb" />
          </Pressable>
        }
        rightAction={
          notifications.length > 0 ? (
            <Pressable
              onPress={markAllAsRead}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <CheckCheck size={20} color="#2563eb" />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View className="items-center justify-center py-24">
            <Bell size={40} color="#94a3b8" />
            <Text variant="h3" className="mt-4">
              No notifications
            </Text>
            <Text
              variant="bodySmall"
              className="mt-1 text-center text-slate-500"
            >
              You're all caught up. Agent activity, approvals, and alerts will
              appear here.
            </Text>
          </View>
        ) : (
          <>
            {unreadCount > 0 && (
              <Text variant="caption" className="text-slate-500">
                {unreadCount} unread
              </Text>
            )}
            {notifications.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => markAsRead(n.id)}
                accessibilityRole="button"
                accessibilityLabel={n.read ? n.title : `Unread: ${n.title}`}
              >
                <Card
                  variant="elevated"
                  className={clsx(
                    "border",
                    !n.read && "border-blue-300 bg-blue-50 dark:bg-slate-800",
                  )}
                >
                  <CardContent>
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text variant="body" className="font-medium">
                          {n.title}
                        </Text>
                        {!!n.body && (
                          <Text
                            variant="bodySmall"
                            className="mt-1 text-slate-600 dark:text-slate-300"
                          >
                            {n.body}
                          </Text>
                        )}
                      </View>
                      {!n.read && (
                        <View className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                      )}
                    </View>
                    <Text variant="caption" className="mt-2 text-slate-400">
                      {formatRelativeTime(n.date)}
                    </Text>
                  </CardContent>
                </Card>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
