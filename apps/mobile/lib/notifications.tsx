import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { trpc } from "./trpc";
import Constants from "expo-constants";
import { getToken, getCurrentEntityId } from "./auth";

type Notification = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  date: Date;
  read: boolean;
};

type NotificationsContextType = {
  notifications: Notification[];
  permission: "granted" | "denied" | "undetermined";
  requestPermission: () => Promise<boolean>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: number;
};

const NotificationsContext = createContext<NotificationsContextType | null>(
  null,
);

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  }
  return context;
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permission, setPermission] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");
  const [token, setToken] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    getToken().then(setToken);
  }, []);

  useEffect(() => {
    if (token) {
      registerForPushNotificationsAsync();
      setupNotificationListeners();
    }
  }, [token]);

  // Keep the in-app notification list + unreadCount fresh:
  //  - refetch whenever the app returns to the foreground,
  //  - poll every 60s while the app is foregrounded (cleared on background).
  const loadRef = useRef(loadUserNotifications);
  loadRef.current = loadUserNotifications;

  useEffect(() => {
    if (!token) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadRef.current();
        if (!interval) {
          interval = setInterval(() => loadRef.current(), 60_000);
        }
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    });

    return () => {
      subscription.remove();
      if (interval) clearInterval(interval);
    };
  }, [token]);

  async function registerForPushNotificationsAsync() {
    if (!Constants.isDevice) {
      setPermission("granted");
      return;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      setPermission("denied");
      return;
    }

    setPermission("granted");

    try {
      const pushToken = await Notifications.getExpoPushTokenAsync();
      await trpc.auth.updatePushToken.mutate({ token: pushToken.data });
    } catch (error) {
      console.error("Failed to register push token:", error);
    }
  }

  function setupNotificationListeners() {
    Notifications.setNotificationListenerAsync((notification) => {
      const newNotification: Notification = {
        id: notification.notification.id,
        title: notification.notification.request.title ?? "",
        body: notification.notification.request.body ?? "",
        data: notification.notification.request.data as
          Record<string, unknown> | undefined,
        date: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    });

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        enableVibration: true,
      });
    }
  }

  async function loadUserNotifications() {
    if (!token) return;

    try {
      const entityId = await getCurrentEntityId();
      const result = await trpc.notifications.list.query({
        entityId: entityId || undefined,
      });
      const loaded =
        result.data?.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          data: n.data ? JSON.parse(n.data as string) : undefined,
          date: new Date(n.createdAt),
          read: n.read,
        })) ?? [];
      setNotifications(loaded);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    trpc.notifications.markAsRead.mutate({ id });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    trpc.notifications.markAllAsRead.mutate({});
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        permission,
        requestPermission: registerForPushNotificationsAsync,
        markAsRead,
        markAllAsRead,
        clearAll,
        unreadCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
