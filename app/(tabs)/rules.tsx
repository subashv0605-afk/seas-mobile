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
import { useApp, EmergencyRule, RuleType } from "@/context/AppContext";

const C = Colors.light;

function getRuleTypeLabel(type: RuleType): string {
  const map: Record<RuleType, string> = {
    specific_number: "Specific Number",
    repeated_call: "Repeated Call",
    group_call: "Group Call",
    keyword_message: "Keyword Message",
  };
  return map[type];
}

function getRuleTypeIcon(type: RuleType): string {
  const map: Record<RuleType, string> = {
    specific_number: "phone",
    repeated_call: "phone-missed",
    group_call: "account-group",
    keyword_message: "message-text",
  };
  return map[type];
}

function RuleTypeChip({ type }: { type: RuleType }) {
  const colorMap: Record<RuleType, string> = {
    specific_number: C.info,
    repeated_call: C.warning,
    group_call: C.success,
    keyword_message: "#9B59B6",
  };
  const color = colorMap[type];
  return (
    <View style={[styles.chip, { backgroundColor: color + "22" }]}>
      <Text style={[styles.chipText, { color }]}>{getRuleTypeLabel(type)}</Text>
    </View>
  );
}

function AnimatedRuleCard({ item, index, notifications, onToggle, onDelete }: {
  item: EmergencyRule;
  index: number;
  notifications: any[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const linkedNotifs = notifications.filter((n) => item.notificationIds.includes(n.id));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={animStyle}
    >
      <Pressable
        onPress={() => router.push({ pathname: "/rule/[id]", params: { id: item.id } })}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <LinearGradient
          colors={[C.surface, C.surfaceLight]}
          style={[styles.card, { opacity: item.enabled ? 1 : 0.6 }]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.ruleIconBox}>
              <MaterialCommunityIcons
                name={getRuleTypeIcon(item.type) as any}
                size={20}
                color={item.enabled ? C.accent : C.textMuted}
              />
            </View>
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
          </View>

          <RuleTypeChip type={item.type} />

          <View style={styles.cardDetails}>
            {item.anyNumber ? (
              <Text style={styles.detailText}>Any number</Text>
            ) : item.contacts.length > 0 ? (
              <Text style={styles.detailText}>
                {item.contacts.join(", ")}
              </Text>
            ) : null}
            {item.keywords.length > 0 && (
              <Text style={styles.detailText}>
                Keywords: {item.keywords.join(", ")}
              </Text>
            )}
            {item.occurrences > 1 && (
              <Text style={styles.detailText}>
                {item.occurrences}x in {item.durationMinutes}min
              </Text>
            )}
          </View>

          {linkedNotifs.length > 0 && (
            <View style={styles.linkedRow}>
              <Feather name="bell" size={12} color={C.textMuted} />
              <Text style={styles.linkedText}>
                {linkedNotifs.map((n) => n.name).join(", ")}
              </Text>
            </View>
          )}

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

export default function RulesScreen() {
  const { rules, notifications, toggleRule, deleteRule } = useApp();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  const handleToggle = useCallback((id: string) => toggleRule(id), [toggleRule]);
  const handleDelete = useCallback((id: string) => deleteRule(id), [deleteRule]);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!rules.length}
        contentContainerStyle={{
          paddingTop: topPad + 12,
          paddingBottom: bottomPad,
          paddingHorizontal: 20,
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Rules</Text>
              <Text style={styles.headerSubtitle}>
                {rules.filter((r) => r.enabled).length} of {rules.length} active
              </Text>
            </View>
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/rule/new");
              }}
            >
              <Feather name="plus" size={22} color="#fff" />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
            <MaterialIcons name="rule" size={56} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No Rules Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first emergency rule to start monitoring
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => router.push("/rule/new")}
            >
              <Text style={styles.emptyBtnText}>Create Rule</Text>
            </Pressable>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <AnimatedRuleCard
            item={item}
            index={index}
            notifications={notifications}
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
    alignItems: "center",
    gap: 10,
  },
  ruleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.accent + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleRow: {
    flex: 1,
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
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  cardDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  linkedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkedText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
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
