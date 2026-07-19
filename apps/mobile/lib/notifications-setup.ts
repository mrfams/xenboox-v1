import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadgeMode: "increment",
    }),
  })

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibration: true,
    })
  }
}

export function configurePushNotifications() {
  Notifications.setNotificationListenerAsync((notification) => {
    const data = notification.notification.request.content.data
    if (data?.url) {
      // Navigate to URL when notification is tapped
    }
  })
}

export async function getPushToken(): Promise<string | null> {
  if (!Notifications.isAvailableAsync()) {
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  if (existingStatus !== "granted") {
    return null
  }

  const token = await Notifications.getExpoPushTokenAsync()
  return token.data
}