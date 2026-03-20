import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp, EventLog } from "@/context/AppContext";
import Constants from "expo-constants";

const C = Colors.light;

function formatTime(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: active ? C.success + "22" : "#ffffff11" }]}>
      <View style={[styles.statusDot, { backgroundColor: active ? C.success : C.textMuted }]} />
      <Text style={[styles.statusText, { color: active ? C.success : C.textMuted }]}>
        {active ? "Monitoring Active" : "Monitoring Paused"}
      </Text>
    </View>
  );
}

function AnimatedLogCard({ item, index }: { item: EventLog; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={animStyle}
    >
      <Pressable
        style={styles.logCard}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <LinearGradient
          colors={[C.surface, C.surfaceLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logCardGradient}
        >
          <View style={styles.logCardHeader}>
            <View style={styles.logIconContainer}>
              <MaterialCommunityIcons name="shield-alert" size={18} color={C.accent} />
            </View>
            <View style={styles.logCardTitleRow}>
              <Text style={styles.logRuleName} numberOfLines={1}>
                {item.ruleName}
              </Text>
              <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
            </View>
          </View>
          <Text style={styles.logDetail} numberOfLines={2}>
            {item.triggerDetails}
          </Text>
          <View style={styles.logActions}>
            {item.actionsTriggered.map((a, i) => (
              <View key={i} style={styles.actionTag}>
                <Text style={styles.actionTagText}>{a}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const { rules, notifications, eventLogs, silentModeActive, setSilentMode, clearLogs } =
    useApp();
  const insets = useSafeAreaInsets();

  const activeRulesCount = rules.filter((r) => r.enabled).length;
  const activeNotifCount = notifications.filter((n) => n.enabled).length;

  const isExpoGo =
    (Constants as any).appOwnership === "expo" ||
    (Constants as any).executionEnvironment === "storeClient";

  const handleToggleMonitoring = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !silentModeActive;
    setSilentMode(next);
    if (next && isExpoGo) {
      Alert.alert(
        "Protection Active (Expo Go Mode)",
        "Push notifications and alarm sound are active.\n\nFor full call detection (incoming calls trigger alerts), install the EAS APK build on your Android device.\n\nSee Settings tab for the build guide.",
        [{ text: "Got it", style: "default" }]
      );
    }
  }, [silentModeActive, setSilentMode, isExpoGo]);

  const handleClearLogs = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearLogs();
  }, [clearLogs]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <FlatList
        data={eventLogs}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!eventLogs.length}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad, paddingHorizontal: 20 }}
        ListHeaderComponent={
          <>
            <Animated.View entering={FadeInRight.springify()} style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>SEAS</Text>
                <Text style={styles.headerSubtitle}>Smart Emergency Alert System</Text>
              </View>
              <StatusBadge active={silentModeActive} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Pressable onPress={handleToggleMonitoring}>
                <LinearGradient
                  colors={silentModeActive ? [C.accent, C.accentDark] : [C.surface, C.surfaceLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.monitoringCard}
                >
                  <MaterialCommunityIcons
                    name={silentModeActive ? "shield-check" : "shield-off"}
                    size={48}
                    color={silentModeActive ? "#fff" : C.textMuted}
                  />
                  <Text style={[styles.monitoringTitle, { color: silentModeActive ? "#fff" : C.textMuted }]}>
                    {silentModeActive ? "Protection Active" : "Protection Paused"}
                  </Text>
                  <Text style={[styles.monitoringSubtitle, { color: silentModeActive ? "rgba(255,255,255,0.75)" : C.textMuted }]}>
                    {silentModeActive
                      ? "Monitoring calls & messages in background"
                      : "Tap to activate emergency monitoring"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.statsRow}>
              <Pressable
                style={styles.statCard}
                onPress={() => router.push("/(tabs)/rules")}
              >
                <LinearGradient
                  colors={[C.surface, C.surfaceLight]}
                  style={styles.statCardGrad}
                >
                  <Text style={styles.statNumber}>{activeRulesCount}</Text>
                  <Text style={styles.statLabel}>Active Rules</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={styles.statCard}
                onPress={() => router.push("/(tabs)/notifications")}
              >
                <LinearGradient
                  colors={[C.surface, C.surfaceLight]}
                  style={styles.statCardGrad}
                >
                  <Text style={styles.statNumber}>{activeNotifCount}</Text>
                  <Text style={styles.statLabel}>Alert Types</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.statCard}>
                <LinearGradient
                  colors={[C.surface, C.surfaceLight]}
                  style={styles.statCardGrad}
                >
                  <Text style={styles.statNumber}>{eventLogs.length}</Text>
                  <Text style={styles.statLabel}>Events Logged</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Events</Text>
              {eventLogs.length > 0 && (
                <Pressable onPress={handleClearLogs}>
                  <Feather name="trash-2" size={18} color={C.textMuted} />
                </Pressable>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
            <MaterialCommunityIcons name="shield-check-outline" size={56} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptySubtitle}>
              Emergency events will appear here when your rules are triggered
            </Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <AnimatedLogCard item={item} index={index} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  monitoringCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  monitoringTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  monitoringSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  statCardGrad: {
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  logCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  logCardGradient: {
    padding: 16,
    gap: 10,
  },
  logCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accent + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  logCardTitleRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logRuleName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    flex: 1,
    marginRight: 8,
  },
  logTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  logDetail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    lineHeight: 18,
  },
  logActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  actionTag: {
    backgroundColor: C.accent + "22",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionTagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: C.accentLight,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
