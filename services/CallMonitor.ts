import { Platform } from "react-native";
import Constants from "expo-constants";
import type { EmergencyRule, NotificationConfig, AutoReply } from "@/context/AppContext";
import { sendEmergencyNotification } from "./NotificationService";
import { playAlarmSound } from "./AudioService";

type MonitorState = {
  rules: EmergencyRule[];
  notifications: NotificationConfig[];
  autoReply: AutoReply;
  onEventLog: (params: {
    ruleId: string;
    ruleName: string;
    triggerDetails: string;
    actionsTriggered: string[];
  }) => void;
};

let callDetector: any = null;
let monitorState: MonitorState | null = null;

const recentCallLog: Map<string, number[]> = new Map();

function isRunningInExpoGo(): boolean {
  try {
    return (
      (Constants as any).appOwnership === "expo" ||
      (Constants as any).executionEnvironment === "storeClient"
    );
  } catch {
    return false;
  }
}

function normalizeNumber(num: string): string {
  return num.replace(/\D/g, "").slice(-10);
}

function matchesContact(incomingNumber: string, contacts: string[]): boolean {
  const normalized = normalizeNumber(incomingNumber);
  return contacts.some((c) => {
    const cn = normalizeNumber(c);
    return cn.length > 0 && (normalized.includes(cn) || cn.includes(normalized));
  });
}

async function handleIncomingCall(number: string) {
  if (!monitorState) return;
  const { rules, notifications, autoReply, onEventLog } = monitorState;

  const enabledRules = rules.filter((r) => r.enabled);

  for (const rule of enabledRules) {
    let triggered = false;
    let triggerDetails = "";

    if (rule.type === "specific_number") {
      if (rule.anyNumber || matchesContact(number, rule.contacts)) {
        triggered = true;
        triggerDetails = `Incoming call from ${number || "Unknown"}`;
      }
    } else if (rule.type === "repeated_call") {
      const now = Date.now();
      const windowMs = rule.durationMinutes * 60 * 1000;
      const key = rule.id;
      const times = recentCallLog.get(key) ?? [];
      const recent = times.filter((t) => now - t < windowMs);
      recent.push(now);
      recentCallLog.set(key, recent);

      if (recent.length >= rule.occurrences) {
        if (rule.anyNumber || matchesContact(number, rule.contacts)) {
          triggered = true;
          triggerDetails = `${recent.length} calls within ${rule.durationMinutes} min from ${number || "Unknown"}`;
          recentCallLog.set(key, []);
        }
      }
    } else if (rule.type === "group_call") {
      if (matchesContact(number, rule.contacts)) {
        const now = Date.now();
        const windowMs = rule.durationMinutes * 60 * 1000;
        const key = `${rule.id}_${number}`;
        const times = recentCallLog.get(key) ?? [];
        const recent = times.filter((t) => now - t < windowMs);
        recent.push(now);
        recentCallLog.set(key, recent);

        const uniqueCallers = new Set(
          rule.contacts.filter((c) => matchesContact(number, [c]))
        );
        if (uniqueCallers.size >= rule.occurrences) {
          triggered = true;
          triggerDetails = `Group call: ${uniqueCallers.size} contacts called within ${rule.durationMinutes}min`;
        }
      }
    }

    if (!triggered) continue;

    const linkedNotifs = notifications.filter(
      (n) => n.enabled && rule.notificationIds.includes(n.id)
    );
    const actionNames = linkedNotifs.map((n) => n.name);

    onEventLog({
      ruleId: rule.id,
      ruleName: rule.name,
      triggerDetails,
      actionsTriggered: actionNames,
    });

    await sendEmergencyNotification({
      ruleName: rule.name,
      triggerDetails,
      actionsTriggered: actionNames,
    });

    const hasRingtone = linkedNotifs.some((n) => n.type === "ringtone");
    const hasVoice = linkedNotifs.some((n) => n.type === "voice_announcement");

    if (hasRingtone || hasVoice) {
      await playAlarmSound();
    }

    if (autoReply.enabled && number) {
      try {
        const SMS = await import("expo-sms");
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          await SMS.sendSMSAsync([number], autoReply.message);
        }
      } catch (e) {
        console.warn("[CallMonitor] SMS auto-reply failed:", e);
      }
    }
  }
}

export async function startCallMonitoring(state: MonitorState): Promise<boolean> {
  if (Platform.OS === "web") {
    console.log("[CallMonitor] Not supported on web");
    return false;
  }

  monitorState = state;

  if (isRunningInExpoGo()) {
    console.log(
      "[CallMonitor] Running in Expo Go — call detection requires an EAS build. " +
        "Push notifications are still active."
    );
    return false;
  }

  try {
    const CallDetectionModule = require("react-native-call-detection");
    const CallDetectorManager =
      CallDetectionModule.default || CallDetectionModule;

    if (callDetector) {
      try { callDetector.dispose(); } catch {}
      callDetector = null;
    }

    callDetector = new CallDetectorManager(
      async (event: string, number: string) => {
        console.log("[CallMonitor] Event:", event, number);
        if (event === "Incoming" || event === "Connected") {
          await handleIncomingCall(number || "");
        }
      },
      true,
      () => {},
      {
        title: "Phone State Permission",
        message: "SEAS needs phone state permission to monitor emergency calls.",
      }
    );

    console.log("[CallMonitor] Native call detection started");
    return true;
  } catch (e) {
    console.warn("[CallMonitor] Call detection failed — requires EAS build:", e);
    return false;
  }
}

export function updateMonitorState(state: MonitorState) {
  monitorState = state;
}

export function stopCallMonitoring() {
  if (callDetector) {
    try { callDetector.dispose(); } catch {}
    callDetector = null;
  }
  monitorState = null;
  recentCallLog.clear();
}

export function isCallMonitoringActive() {
  return callDetector !== null;
}
