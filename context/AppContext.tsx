import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import {
  setupNotificationChannel,
  requestNotificationPermission,
  addNotificationResponseListener,
} from "@/services/NotificationService";
import {
  startCallMonitoring,
  stopCallMonitoring,
  updateMonitorState,
} from "@/services/CallMonitor";
import { setupAudio } from "@/services/AudioService";

export type RuleType =
  | "specific_number"
  | "repeated_call"
  | "group_call"
  | "keyword_message";

export type NotificationType = "ringtone" | "voice_announcement" | "gmail";

export type EmergencyRule = {
  id: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  contacts: string[];
  anyNumber: boolean;
  occurrences: number;
  durationMinutes: number;
  keywords: string[];
  notificationIds: string[];
  createdAt: number;
};

export type NotificationConfig = {
  id: string;
  name: string;
  type: NotificationType;
  enabled: boolean;
  ringtoneLabel?: string;
  voiceText?: string;
  gmailAddress?: string;
};

export type EventLog = {
  id: string;
  timestamp: number;
  ruleId: string;
  ruleName: string;
  triggerDetails: string;
  actionsTriggered: string[];
};

export type AutoReply = {
  enabled: boolean;
  message: string;
};

export type PermissionStatus = {
  notifications: boolean;
  contacts: boolean;
  phoneState: boolean;
};

type AppContextType = {
  rules: EmergencyRule[];
  notifications: NotificationConfig[];
  eventLogs: EventLog[];
  autoReply: AutoReply;
  silentModeActive: boolean;
  monitoringNative: boolean;
  permissions: PermissionStatus;
  addRule: (rule: Omit<EmergencyRule, "id" | "createdAt">) => void;
  updateRule: (id: string, updates: Partial<EmergencyRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  addNotification: (n: Omit<NotificationConfig, "id">) => void;
  updateNotification: (id: string, updates: Partial<NotificationConfig>) => void;
  deleteNotification: (id: string) => void;
  addEventLog: (log: Omit<EventLog, "id" | "timestamp">) => void;
  clearLogs: () => void;
  updateAutoReply: (updates: Partial<AutoReply>) => void;
  setSilentMode: (active: boolean) => void;
  requestAllPermissions: () => Promise<void>;
};

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

const STORAGE_KEYS = {
  rules: "seas_rules",
  notifications: "seas_notifications",
  eventLogs: "seas_event_logs",
  autoReply: "seas_auto_reply",
};

const defaultNotifications: NotificationConfig[] = [
  {
    id: "notif_1",
    name: "Alarm Ringtone",
    type: "ringtone",
    enabled: true,
    ringtoneLabel: "Default Emergency Tone",
  },
  {
    id: "notif_2",
    name: "Voice Alert",
    type: "voice_announcement",
    enabled: true,
    voiceText: "Emergency! Someone is trying to reach you urgently.",
  },
  {
    id: "notif_3",
    name: "Email Alert",
    type: "gmail",
    enabled: false,
    gmailAddress: "",
  },
];

const defaultRules: EmergencyRule[] = [
  {
    id: "rule_1",
    name: "Mom's Emergency Call",
    type: "specific_number",
    enabled: true,
    contacts: ["Mom"],
    anyNumber: false,
    occurrences: 1,
    durationMinutes: 0,
    keywords: [],
    notificationIds: ["notif_1", "notif_2"],
    createdAt: Date.now() - 86400000,
  },
  {
    id: "rule_2",
    name: "Urgent Keyword",
    type: "keyword_message",
    enabled: true,
    contacts: [],
    anyNumber: true,
    occurrences: 1,
    durationMinutes: 0,
    keywords: ["urgent", "emergency", "help", "SOS"],
    notificationIds: ["notif_1"],
    createdAt: Date.now() - 43200000,
  },
];

const defaultAutoReply: AutoReply = {
  enabled: true,
  message: "I am currently unavailable. I will respond shortly.",
};

const defaultLogs: EventLog[] = [
  {
    id: "log_1",
    timestamp: Date.now() - 3600000,
    ruleId: "rule_1",
    ruleName: "Mom's Emergency Call",
    triggerDetails: "Incoming call from +1 (555) 234-5678",
    actionsTriggered: ["Alarm Ringtone", "Voice Alert"],
  },
];

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = useState<EmergencyRule[]>(defaultRules);
  const [notifications, setNotifications] = useState<NotificationConfig[]>(defaultNotifications);
  const [eventLogs, setEventLogs] = useState<EventLog[]>(defaultLogs);
  const [autoReply, setAutoReply] = useState<AutoReply>(defaultAutoReply);
  const [silentModeActive, setSilentModeActiveState] = useState(false);
  const [monitoringNative, setMonitoringNative] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStatus>({
    notifications: false,
    contacts: false,
    phoneState: false,
  });
  const [loaded, setLoaded] = useState(false);

  const notifListenerRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await setupAudio();
        await setupNotificationChannel();

        const notifGranted = await requestNotificationPermission();
        setPermissions((p) => ({ ...p, notifications: notifGranted }));

        notifListenerRef.current = addNotificationResponseListener((resp) => {
          console.log("[AppContext] Notification tapped:", resp.notification.request.identifier);
        });
      } catch (e) {
        console.warn("[AppContext] Init error:", e);
      }
    };
    init();

    return () => {
      notifListenerRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [r, n, l, a] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.rules),
          AsyncStorage.getItem(STORAGE_KEYS.notifications),
          AsyncStorage.getItem(STORAGE_KEYS.eventLogs),
          AsyncStorage.getItem(STORAGE_KEYS.autoReply),
        ]);
        if (r) setRules(JSON.parse(r));
        if (n) setNotifications(JSON.parse(n));
        if (l) setEventLogs(JSON.parse(l));
        if (a) setAutoReply(JSON.parse(a));
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoaded(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.rules, JSON.stringify(rules));
  }, [rules, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
  }, [notifications, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.eventLogs, JSON.stringify(eventLogs));
  }, [eventLogs, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.autoReply, JSON.stringify(autoReply));
  }, [autoReply, loaded]);

  const addEventLog = useCallback((log: Omit<EventLog, "id" | "timestamp">) => {
    const newLog: EventLog = { ...log, id: generateId(), timestamp: Date.now() };
    setEventLogs((prev) => [newLog, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    if (!loaded || !silentModeActive) return;
    updateMonitorState({
      rules,
      notifications,
      autoReply,
      onEventLog: addEventLog,
    });
  }, [rules, notifications, autoReply, silentModeActive, loaded, addEventLog]);

  const setSilentMode = useCallback(
    async (active: boolean) => {
      setSilentModeActiveState(active);

      if (active) {
        const started = await startCallMonitoring({
          rules,
          notifications,
          autoReply,
          onEventLog: addEventLog,
        });
        setMonitoringNative(started);
      } else {
        stopCallMonitoring();
        setMonitoringNative(false);
      }
    },
    [rules, notifications, autoReply, addEventLog]
  );

  const requestAllPermissions = useCallback(async () => {
    const notifGranted = await requestNotificationPermission();

    let contactsGranted = false;
    try {
      const Contacts = await import("expo-contacts");
      const { status } = await Contacts.requestPermissionsAsync();
      contactsGranted = status === "granted";
    } catch (e) {
      console.warn("[AppContext] Contacts permission error:", e);
    }

    setPermissions({
      notifications: notifGranted,
      contacts: contactsGranted,
      phoneState: false,
    });
  }, []);

  const addRule = useCallback((rule: Omit<EmergencyRule, "id" | "createdAt">) => {
    const newRule: EmergencyRule = { ...rule, id: generateId(), createdAt: Date.now() };
    setRules((prev) => [newRule, ...prev]);
  }, []);

  const updateRule = useCallback((id: string, updates: Partial<EmergencyRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleRule = useCallback((id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }, []);

  const addNotification = useCallback((n: Omit<NotificationConfig, "id">) => {
    const newN: NotificationConfig = { ...n, id: generateId() };
    setNotifications((prev) => [...prev, newN]);
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<NotificationConfig>) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setRules((prev) =>
      prev.map((r) => ({ ...r, notificationIds: r.notificationIds.filter((nid) => nid !== id) }))
    );
  }, []);

  const clearLogs = useCallback(() => {
    setEventLogs([]);
  }, []);

  const updateAutoReply = useCallback((updates: Partial<AutoReply>) => {
    setAutoReply((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        rules,
        notifications,
        eventLogs,
        autoReply,
        silentModeActive,
        monitoringNative,
        permissions,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
        addNotification,
        updateNotification,
        deleteNotification,
        addEventLog,
        clearLogs,
        updateAutoReply,
        setSilentMode,
        requestAllPermissions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
