import { Feather, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp, NotificationConfig, NotificationType } from "@/context/AppContext";

const C = Colors.light;

function getNotifIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    ringtone: "music-note",
    voice_announcement: "account-voice",
    gmail: "email",
  };
  return map[type];
}

function getNotifTypeLabel(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    ringtone: "Ringtone Override",
    voice_announcement: "Voice Announcement",
    gmail: "Gmail Alert",
  };
  return map[type];
}

function getNotifColor(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    ringtone: C.info,
    voice_announcement: "#9B59B6",
    gmail: C.accent,
  };
  return map[type];
}

function NotifDetail({ notif }: { notif: NotificationConfig }) {
  if (notif.type === "ringtone" && notif.ringtoneLabel) {
    return <Text style={styles.detailText}>{notif.ringtoneLabel}</Text>;
  }
  if (notif.type === "voice_announcement" && notif.voiceText) {
    return (
      <Text style={styles.detailText} numberOfLines={2}>
        "{notif.voiceText}"
      </Text>
    );
  }
  if (notif.type === "gmail") {
    return (
      <Text style={styles.detailText}>
        {notif.gmailAddress || "No email configured"}
      </Text>
    );
  }
  return null;
}

function AnimatedNotifCard({ item, index, onToggle, onDelete }: {
  item: NotificationConfig;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = getNotifColor(item.type);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={animStyle}
    >
      <Pressable
        onPress={() => router.push({ pathname: "/notification/[id]", params: { id: item.id } })}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <LinearGradient
          colors={[C.surface, C.surfaceLight]}
          style={[styles.card, { opacity: item.enabled ? 1 : 0.6 }]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: color + "22" }]}>
              <MaterialCommunityIcons
                name={getNotifIcon(item.type) as any}
                size={22}
                color={color}
              />
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Switch
                  value={item.enabled}
                  onValueChange={() => {
                    Haptics.selectionAsync();
                    onToggle(item.id);
                  }}
                  trackColor={{ false: C.border, true: C.accent + "80" }}
                  thumbColor={item.enabled ? C.accent : C.textMuted}
                />
              </View>
              <View style={[styles.typeChip, { backgroundColor: color + "22" }]}>
                <Text style={[styles.typeChipText, { color }]}>
                  {getNotifTypeLabel(item.type)}
                </Text>
              </View>
            </View>
          </View>

          <NotifDetail notif={item} />

          <Pressable
            style={styles.deleteBtn}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onDelete(item.id);
            }}
            hitSlop={12}
          >
            <Feather name="trash-2" size={16} color={C.textMuted} />
          </Pressable>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const { notifications, updateNotification, deleteNotification } = useApp();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  const handleToggle = useCallback(
    (id: string) => {
      const notif = notifications.find((n) => n.id === id);
      if (notif) updateNotification(id, { enabled: !notif.enabled });
    },
    [notifications, updateNotification]
  );

  const handleDelete = useCallback(
    (id: string) => deleteNotification(id),
    [deleteNotification]
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!notifications.length}
        contentContainerStyle={{
          paddingTop: topPad + 12,
          paddingBottom: bottomPad,
          paddingHorizontal: 20,
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Alerts</Text>
              <Text style={styles.headerSubtitle}>
                {notifications.filter((n) => n.enabled).length} active alert methods
              </Text>
            </View>
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/notification/new");
              }}
            >
              <Feather name="plus" size={22} color="#fff" />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={56} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No Alerts Configured</Text>
            <Text style={styles.emptySubtitle}>
              Add notification methods to be alerted during emergencies
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => router.push("/notification/new")}
            >
              <Text style={styles.emptyBtnText}>Add Alert</Text>
            </Pressable>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <AnimatedNotifCard
            item={item}
            index={index}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    flex: 1,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    flex: 1,
    marginRight: 8,
  },
  typeChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeChipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  detailText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    lineHeight: 18,
  },
  deleteBtn: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
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
  emptyBtn: {
    marginTop: 8,
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
