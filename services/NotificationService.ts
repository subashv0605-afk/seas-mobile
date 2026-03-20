import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const EMERGENCY_CHANNEL_ID = "seas_emergency";
export const EMERGENCY_CHANNEL_NAME = "Emergency Alerts";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function setupNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
      name: EMERGENCY_CHANNEL_NAME,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#E53935",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      enableVibrate: true,
      showBadge: true,
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: true,
    },
  });
  return status === "granted";
}

export async function sendEmergencyNotification(params: {
  ruleName: string;
  triggerDetails: string;
  actionsTriggered: string[];
}) {
  const { ruleName, triggerDetails, actionsTriggered } = params;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 Emergency Alert: ${ruleName}`,
      body: triggerDetails,
      subtitle: actionsTriggered.join(" • "),
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 300, 200, 300, 200, 300],
      color: "#E53935",
      categoryIdentifier: "EMERGENCY_ALERT",
      data: {
        ruleName,
        triggerDetails,
        actionsTriggered,
        timestamp: Date.now(),
      },
    },
    trigger: null,
  });
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}
