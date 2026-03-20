import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp, NotificationType } from "@/context/AppContext";

const C = Colors.light;

const NOTIF_TYPES: { type: NotificationType; label: string; icon: string; desc: string; color: string }[] = [
  {
    type: "ringtone",
    label: "Ringtone Override",
    icon: "music-note",
    desc: "Play a loud ringtone even in silent mode",
    color: C.info,
  },
  {
    type: "voice_announcement",
    label: "Voice Announcement",
    icon: "account-voice",
    desc: "Convert text to speech and announce loudly",
    color: "#9B59B6",
  },
  {
    type: "gmail",
    label: "Gmail Alert",
    icon: "email",
    desc: "Send an email notification to a Gmail address",
    color: C.accent,
  },
];

export default function NewNotificationScreen() {
  const { addNotification } = useApp();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [notifType, setNotifType] = useState<NotificationType>("ringtone");
  const [ringtoneLabel, setRingtoneLabel] = useState("Emergency Alarm");
  const [voiceText, setVoiceText] = useState("Emergency! Someone is trying to reach you urgently. Please check your phone.");
  const [gmailAddress, setGmailAddress] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;

    addNotification({
      name: name.trim(),
      type: notifType,
      enabled: true,
      ringtoneLabel: notifType === "ringtone" ? ringtoneLabel : undefined,
      voiceText: notifType === "voice_announcement" ? voiceText : undefined,
      gmailAddress: notifType === "gmail" ? gmailAddress : undefined,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const selectedType = NOTIF_TYPES.find((t) => t.type === notifType);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <LinearGradient colors={[C.backgroundMid as any, C.background]} style={styles.modalHandle}>
        <View style={styles.handle} />
        <View style={styles.modalHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={C.textSecondary} />
          </Pressable>
          <Text style={styles.modalTitle}>New Alert</Text>
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
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Loud Alarm"
            placeholderTextColor={C.textMuted}
            autoFocus
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.section}>
          <Text style={styles.label}>Alert Type</Text>
          <View style={styles.typeList}>
            {NOTIF_TYPES.map((nt) => (
              <Pressable
                key={nt.type}
                onPress={() => {
                  Haptics.selectionAsync();
                  setNotifType(nt.type);
                }}
              >
                <LinearGradient
                  colors={notifType === nt.type ? [nt.color + "33", nt.color + "11"] : [C.surface, C.surfaceLight]}
                  style={[
                    styles.typeCard,
                    notifType === nt.type && { borderColor: nt.color, borderWidth: 2 },
                  ]}
                >
                  <View style={[styles.typeIconBox, { backgroundColor: nt.color + "22" }]}>
                    <MaterialCommunityIcons name={nt.icon as any} size={26} color={nt.color} />
                  </View>
                  <View style={styles.typeMeta}>
                    <Text style={[styles.typeLabel, { color: notifType === nt.type ? nt.color : C.text }]}>
                      {nt.label}
                    </Text>
                    <Text style={styles.typeDesc}>{nt.desc}</Text>
                  </View>
                  {notifType === nt.type && (
                    <Feather name="check-circle" size={18} color={nt.color} />
                  )}
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {notifType === "ringtone" && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
            <Text style={styles.label}>Ringtone</Text>
            <Text style={styles.sublabel}>
              On a real device, this will override silent mode and play at maximum volume
            </Text>
            <TextInput
              style={styles.input}
              value={ringtoneLabel}
              onChangeText={setRingtoneLabel}
              placeholder="Ringtone label"
              placeholderTextColor={C.textMuted}
            />
            <View style={styles.infoBanner}>
              <MaterialCommunityIcons name="information" size={16} color={C.info} />
              <Text style={styles.infoText}>
                Requires Do Not Disturb override permission on Android
              </Text>
            </View>
          </Animated.View>
        )}

        {notifType === "voice_announcement" && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
            <Text style={styles.label}>Announcement Text</Text>
            <Text style={styles.sublabel}>
              This text will be converted to speech and played out loud
            </Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={voiceText}
              onChangeText={setVoiceText}
              placeholder="Enter the message to announce..."
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>
        )}

        {notifType === "gmail" && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
            <Text style={styles.label}>Gmail Address</Text>
            <Text style={styles.sublabel}>
              An email alert will be sent to this address when triggered
            </Text>
            <TextInput
              style={styles.input}
              value={gmailAddress}
              onChangeText={setGmailAddress}
              placeholder="your@gmail.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.infoBanner}>
              <MaterialCommunityIcons name="information" size={16} color={C.info} />
              <Text style={styles.infoText}>
                Requires Gmail integration to be configured in the app settings
              </Text>
            </View>
          </Animated.View>
        )}
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
  sublabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted },
  input: { backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontFamily: "Inter_400Regular", fontSize: 14 },
  multilineInput: { minHeight: 90, paddingTop: 12 },
  typeList: { gap: 10 },
  typeCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, gap: 12, borderWidth: 2, borderColor: "transparent" },
  typeIconBox: { width: 50, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeMeta: { flex: 1, gap: 3 },
  typeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  typeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.info + "15", borderRadius: 10, padding: 12 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: C.info, lineHeight: 17 },
  
} as any);
