import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Linking } from "react-native";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const C = Colors.light;

function SettingRow({
  icon,
  iconColor,
  label,
  subtitle,
  right,
}: {
  icon: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + "22" }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.settingLabel}>
        <Text style={styles.settingName}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <View>{right}</View>
    </View>
  );
}

function SectionCard({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <LinearGradient colors={[C.surface, C.surfaceLight]} style={styles.sectionCard}>
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

function PermissionRow({
  icon,
  label,
  subtitle,
  granted,
  onGrant,
  easOnly,
}: {
  icon: string;
  label: string;
  subtitle: string;
  granted: boolean;
  onGrant: () => void;
  easOnly?: boolean;
}) {
  return (
    <View style={styles.permissionRow}>
      <View style={[styles.permissionIcon, { backgroundColor: granted ? C.success + "22" : easOnly ? C.textMuted + "22" : C.accent + "22" }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={granted ? C.success : easOnly ? C.textMuted : C.accent} />
      </View>
      <View style={styles.permissionInfo}>
        <Text style={styles.permissionLabel}>{label}</Text>
        <Text style={styles.permissionSub}>{subtitle}</Text>
      </View>
      {granted ? (
        <View style={styles.grantedBadge}>
          <Feather name="check" size={12} color={C.success} />
          <Text style={styles.grantedText}>Active</Text>
        </View>
      ) : easOnly ? (
        <View style={[styles.grantedBadge, { backgroundColor: C.textMuted + "20" }]}>
          <Text style={[styles.grantedText, { color: C.textMuted }]}>EAS Build</Text>
        </View>
      ) : (
        <Pressable style={styles.grantBtn} onPress={onGrant}>
          <Text style={styles.grantBtnText}>Grant</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const { autoReply, updateAutoReply, rules, notifications, clearLogs, permissions, requestAllPermissions, monitoringNative } = useApp();
  const insets = useSafeAreaInsets();
  const [editingMessage, setEditingMessage] = useState(false);
  const [msgDraft, setMsgDraft] = useState(autoReply.message);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  const handleSaveMessage = () => {
    updateAutoReply({ message: msgDraft });
    setEditingMessage(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Logs",
      "This will permanently delete all event logs. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearLogs();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleGrantAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await requestAllPermissions();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openAppSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const allGranted = permissions.notifications && permissions.contacts;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 12,
          paddingBottom: bottomPad,
          paddingHorizontal: 20,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Configure SEAS behavior</Text>
        </Animated.View>

        {!allGranted && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <Pressable style={styles.permissionBanner} onPress={handleGrantAll}>
              <MaterialCommunityIcons name="shield-alert" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionBannerTitle}>Permissions Required</Text>
                <Text style={styles.permissionBannerSub}>Tap to grant all required permissions for SEAS to work</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#fff" />
            </Pressable>
          </Animated.View>
        )}

        <SectionCard title="Auto Reply" delay={100}>
          <SettingRow
            icon="message-reply"
            iconColor={C.success}
            label="Auto Reply SMS"
            subtitle="Send automatic reply when emergency is triggered"
            right={
              <Switch
                value={autoReply.enabled}
                onValueChange={(val) => {
                  Haptics.selectionAsync();
                  updateAutoReply({ enabled: val });
                }}
                trackColor={{ false: C.border, true: C.accent + "80" }}
                thumbColor={autoReply.enabled ? C.accent : C.textMuted}
              />
            }
          />
          <View style={styles.divider} />
          <View style={styles.messageSection}>
            <View style={styles.messageLabelRow}>
              <Text style={styles.messageLabel}>Reply Message</Text>
              <Pressable
                onPress={() => {
                  if (editingMessage) {
                    handleSaveMessage();
                  } else {
                    setEditingMessage(true);
                    setMsgDraft(autoReply.message);
                  }
                }}
              >
                <Feather
                  name={editingMessage ? "check" : "edit-2"}
                  size={18}
                  color={editingMessage ? C.success : C.textMuted}
                />
              </Pressable>
            </View>
            {editingMessage ? (
              <TextInput
                style={styles.messageInput}
                value={msgDraft}
                onChangeText={setMsgDraft}
                multiline
                autoFocus
                placeholderTextColor={C.textMuted}
                placeholder="Enter auto-reply message..."
              />
            ) : (
              <Text style={styles.messageText}>{autoReply.message}</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard title="Permissions" delay={150}>
          <PermissionRow
            icon="bell-ring"
            label="Notifications"
            subtitle="Required to send emergency alerts"
            granted={permissions.notifications}
            onGrant={handleGrantAll}
          />
          <View style={styles.divider} />
          <PermissionRow
            icon="contacts"
            label="Contacts"
            subtitle="Required to pick contacts for rules"
            granted={permissions.contacts}
            onGrant={handleGrantAll}
          />
          <View style={styles.divider} />
          <PermissionRow
            icon="phone"
            label="Phone State"
            subtitle="Call monitoring — requires EAS APK build"
            granted={monitoringNative}
            onGrant={openAppSettings}
            easOnly
          />
          <View style={styles.divider} />
          <Pressable style={styles.openSettingsRow} onPress={openAppSettings}>
            <MaterialCommunityIcons name="cog" size={16} color={C.textMuted} />
            <Text style={styles.openSettingsText}>Open App Settings</Text>
            <Feather name="external-link" size={14} color={C.textMuted} />
          </Pressable>
        </SectionCard>

        <SectionCard title="Monitoring Status" delay={190}>
          <View style={styles.monitorStatusRow}>
            <View style={[styles.monitorDot, { backgroundColor: monitoringNative ? C.success : C.warning }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.monitorStatusLabel}>
                {monitoringNative ? "Native Call Detection Active" : "Expo Go Mode"}
              </Text>
              <Text style={styles.monitorStatusSub}>
                {monitoringNative
                  ? "Real-time call monitoring is running"
                  : "Build the EAS APK for full call detection"}
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Summary" delay={200}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{rules.length}</Text>
              <Text style={styles.summaryLabel}>Total Rules</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {rules.filter((r) => r.enabled).length}
              </Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{notifications.length}</Text>
              <Text style={styles.summaryLabel}>Alerts</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Data" delay={250}>
          <Pressable onPress={handleClearData} style={styles.dangerRow}>
            <Feather name="trash-2" size={16} color={C.accent} />
            <Text style={styles.dangerText}>Clear All Event Logs</Text>
          </Pressable>
        </SectionCard>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.footer}>
          <MaterialCommunityIcons name="shield" size={20} color={C.textMuted} />
          <Text style={styles.footerText}>SEAS v1.0.0 — Smart Emergency Alert System</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 32, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 2, marginBottom: 4 },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 14,
  },
  permissionBannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  permissionBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 16, padding: 16, gap: 0 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1 },
  settingName: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  settingSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: C.background, marginVertical: 12 },
  messageSection: { gap: 10 },
  messageLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  messageLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  messageInput: { backgroundColor: C.background, borderRadius: 12, padding: 12, color: C.text, fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  messageText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary, lineHeight: 20 },
  permissionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  permissionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  permissionInfo: { flex: 1 },
  permissionLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  permissionSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 1 },
  grantedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.success + "20", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  grantedText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.success },
  grantBtn: { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  grantBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  openSettingsRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  openSettingsText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
  monitorStatusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  monitorDot: { width: 10, height: 10, borderRadius: 5 },
  monitorStatusLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  monitorStatusSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 2 },
  summaryGrid: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 8, gap: 4 },
  summaryNumber: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted },
  summaryDivider: { width: 1, height: 40, backgroundColor: C.background },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  dangerText: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.accent },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted },
});
