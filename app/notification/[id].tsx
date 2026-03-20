import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { useApp, NotificationType } from "@/context/AppContext";

const C = Colors.light;

const NOTIF_TYPES: { type: NotificationType; label: string; icon: string; color: string }[] = [
  { type: "ringtone", label: "Ringtone Override", icon: "music-note", color: C.info },
  { type: "voice_announcement", label: "Voice Announcement", icon: "account-voice", color: "#9B59B6" },
  { type: "gmail", label: "Gmail Alert", icon: "email", color: C.accent },
];

export default function EditNotificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notifications, updateNotification, deleteNotification } = useApp();
  const insets = useSafeAreaInsets();

  const notif = notifications.find((n) => n.id === id);

  const [name, setName] = useState(notif?.name ?? "");
  const [notifType, setNotifType] = useState<NotificationType>(notif?.type ?? "ringtone");
  const [enabled, setEnabled] = useState(notif?.enabled ?? true);
  const [ringtoneLabel, setRingtoneLabel] = useState(notif?.ringtoneLabel ?? "Emergency Alarm");
  const [voiceText, setVoiceText] = useState(notif?.voiceText ?? "");
  const [gmailAddress, setGmailAddress] = useState(notif?.gmailAddress ?? "");

  if (!notif) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: C.textMuted }}>Alert not found</Text>
      </View>
    );
  }

  const handleSave = () => {
    if (!name.trim()) return;
    updateNotification(id, {
      name: name.trim(),
      type: notifType,
      enabled,
      ringtoneLabel: notifType === "ringtone" ? ringtoneLabel : undefined,
      voiceText: notifType === "voice_announcement" ? voiceText : undefined,
      gmailAddress: notifType === "gmail" ? gmailAddress : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert("Delete Alert", `Delete "${notif.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteNotification(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <LinearGradient colors={[C.backgroundMid as any, C.background]} style={styles.modalHandle}>
        <View style={styles.handle} />
        <View style={styles.modalHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={C.textSecondary} />
          </Pressable>
          <Text style={styles.modalTitle}>Edit Alert</Text>
          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, { opacity: name.trim() ? 1 : 0.4 }]}
            disabled={!name.trim()}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.section}>
          <Text style={styles.label}>Alert Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Alert name" placeholderTextColor={C.textMuted} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
          <Text style={styles.label}>Alert Type</Text>
          <View style={styles.typeList}>
            {NOTIF_TYPES.map((nt) => (
              <Pressable key={nt.type} onPress={() => { Haptics.selectionAsync(); setNotifType(nt.type); }}>
                <LinearGradient
                  colors={notifType === nt.type ? [nt.color + "33", nt.color + "11"] : [C.surface, C.surfaceLight]}
                  style={[styles.typeCard, notifType === nt.type && { borderColor: nt.color, borderWidth: 2 }]}
                >
                  <View style={[styles.typeIconBox, { backgroundColor: nt.color + "22" }]}>
                    <MaterialCommunityIcons name={nt.icon as any} size={24} color={nt.color} />
                  </View>
                  <Text style={[styles.typeLabel, { color: notifType === nt.type ? nt.color : C.text }]}>{nt.label}</Text>
                  {notifType === nt.type && <Feather name="check-circle" size={18} color={nt.color} style={{ marginLeft: "auto" }} />}
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {notifType === "ringtone" && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.label}>Ringtone Label</Text>
            <TextInput style={styles.input} value={ringtoneLabel} onChangeText={setRingtoneLabel} placeholder="Ringtone label" placeholderTextColor={C.textMuted} />
          </Animated.View>
        )}

        {notifType === "voice_announcement" && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.label}>Announcement Text</Text>
            <TextInput style={[styles.input, styles.multilineInput]} value={voiceText} onChangeText={setVoiceText} placeholder="Text to speak..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" />
          </Animated.View>
        )}

        {notifType === "gmail" && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.label}>Gmail Address</Text>
            <TextInput style={styles.input} value={gmailAddress} onChangeText={setGmailAddress} placeholder="your@gmail.com" placeholderTextColor={C.textMuted} keyboardType="email-address" autoCapitalize="none" />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Enable Alert</Text>
            <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: C.border, true: C.accent + "80" }} thumbColor={enabled ? C.accent : C.textMuted} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify()} style={{ paddingTop: 8, paddingBottom: 8 }}>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Feather name="trash-2" size={18} color={C.accent} />
            <Text style={styles.deleteButtonText}>Delete Alert</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalHandle: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.textMuted, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: C.text },
  saveBtn: { backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  section: { paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: C.surface },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  input: { backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontFamily: "Inter_400Regular", fontSize: 14 },
  multilineInput: { minHeight: 90, paddingTop: 12 },
  typeList: { gap: 10 },
  typeCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, gap: 12, borderWidth: 2, borderColor: "transparent" },
  typeIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  typeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 12, backgroundColor: C.accent + "15" },
  deleteButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.accent },
  
} as any);
