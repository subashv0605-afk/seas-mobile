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
import { useApp, RuleType } from "@/context/AppContext";
import ContactPickerModal from "@/components/ContactPickerModal";

const C = Colors.light;

const RULE_TYPES: { type: RuleType; label: string; icon: string; color: string }[] = [
  { type: "specific_number", label: "Specific Number", icon: "phone", color: C.info },
  { type: "repeated_call", label: "Repeated Call", icon: "phone-missed", color: C.warning },
  { type: "group_call", label: "Group Call", icon: "account-group", color: C.success },
  { type: "keyword_message", label: "Keyword Message", icon: "message-text", color: "#9B59B6" },
];

export default function EditRuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rules, notifications, updateRule, deleteRule } = useApp();
  const insets = useSafeAreaInsets();

  const rule = rules.find((r) => r.id === id);

  const initContacts = rule?.contacts.map((c) => ({ name: c, number: c })) ?? [];

  const [name, setName] = useState(rule?.name ?? "");
  const [ruleType, setRuleType] = useState<RuleType>(rule?.type ?? "specific_number");
  const [anyNumber, setAnyNumber] = useState(rule?.anyNumber ?? false);
  const [selectedContacts, setSelectedContacts] = useState<{ name: string; number: string }[]>(initContacts);
  const [occurrences, setOccurrences] = useState(String(rule?.occurrences ?? 2));
  const [durationMinutes, setDurationMinutes] = useState(String(rule?.durationMinutes ?? 5));
  const [keywordsText, setKeywordsText] = useState(rule?.keywords.join(", ") ?? "");
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>(rule?.notificationIds ?? []);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [showContactPicker, setShowContactPicker] = useState(false);

  if (!rule) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: C.textMuted }}>Rule not found</Text>
      </View>
    );
  }

  const toggleNotif = (nid: string) => {
    setSelectedNotifIds((prev) =>
      prev.includes(nid) ? prev.filter((n) => n !== nid) : [...prev, nid]
    );
  };

  const removeContact = (number: string) => {
    setSelectedContacts((prev) => prev.filter((c) => c.number !== number));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const contacts = anyNumber
      ? []
      : selectedContacts.map((c) => c.number || c.name);
    const keywords = keywordsText.split(",").map((k) => k.trim()).filter(Boolean);

    updateRule(id, {
      name: name.trim(),
      type: ruleType,
      enabled,
      contacts,
      anyNumber,
      occurrences: parseInt(occurrences) || 1,
      durationMinutes: parseInt(durationMinutes) || 5,
      keywords,
      notificationIds: selectedNotifIds,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert("Delete Rule", `Delete "${rule.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteRule(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.back();
        },
      },
    ]);
  };

  const showOccurrences = ruleType === "repeated_call" || ruleType === "group_call";
  const showKeywords = ruleType === "keyword_message";
  const showContacts = ruleType !== "keyword_message";

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <LinearGradient colors={[C.backgroundMid as any, C.background]} style={styles.modalHandle}>
        <View style={styles.handle} />
        <View style={styles.modalHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={C.textSecondary} />
          </Pressable>
          <Text style={styles.modalTitle}>Edit Rule</Text>
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
          <Text style={styles.label}>Rule Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Mom's Emergency"
            placeholderTextColor={C.textMuted}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
          <Text style={styles.label}>Rule Type</Text>
          <View style={styles.typeGrid}>
            {RULE_TYPES.map((rt) => (
              <Pressable
                key={rt.type}
                onPress={() => { Haptics.selectionAsync(); setRuleType(rt.type); }}
                style={[styles.typeCard, ruleType === rt.type && { borderColor: rt.color, borderWidth: 2 }]}
              >
                <LinearGradient
                  colors={ruleType === rt.type ? [rt.color + "33", rt.color + "11"] : [C.surface, C.surfaceLight]}
                  style={styles.typeCardGrad}
                >
                  <MaterialCommunityIcons name={rt.icon as any} size={24} color={ruleType === rt.type ? rt.color : C.textMuted} />
                  <Text style={[styles.typeCardLabel, { color: ruleType === rt.type ? rt.color : C.textSecondary }]} numberOfLines={2}>
                    {rt.label}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {showContacts && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Any Number</Text>
              <Switch
                value={anyNumber}
                onValueChange={(v) => { Haptics.selectionAsync(); setAnyNumber(v); }}
                trackColor={{ false: C.border, true: C.accent + "80" }}
                thumbColor={anyNumber ? C.accent : C.textMuted}
              />
            </View>
            {!anyNumber && (
              <>
                <Pressable
                  style={styles.contactPickerBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowContactPicker(true);
                  }}
                >
                  <MaterialCommunityIcons name="contacts" size={18} color={C.accent} />
                  <Text style={styles.contactPickerBtnText}>
                    {selectedContacts.length > 0
                      ? `${selectedContacts.length} contact${selectedContacts.length > 1 ? "s" : ""} selected`
                      : "Pick from Contacts"}
                  </Text>
                  <Feather name="chevron-right" size={16} color={C.textMuted} />
                </Pressable>
                {selectedContacts.length > 0 && (
                  <View style={styles.contactTagsRow}>
                    {selectedContacts.map((c) => (
                      <Pressable
                        key={c.number}
                        style={styles.contactTag}
                        onPress={() => removeContact(c.number)}
                      >
                        <Text style={styles.contactTagText}>{c.name}</Text>
                        <Feather name="x" size={12} color={C.accent} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
          </Animated.View>
        )}

        {showOccurrences && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
            <Text style={styles.label}>Trigger Conditions</Text>
            <View style={styles.rowTwo}>
              <View style={styles.halfInput}>
                <Text style={styles.sublabel}>Occurrences</Text>
                <TextInput style={styles.input} value={occurrences} onChangeText={setOccurrences} keyboardType="number-pad" placeholder="2" placeholderTextColor={C.textMuted} />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.sublabel}>Within (minutes)</Text>
                <TextInput style={styles.input} value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" placeholder="5" placeholderTextColor={C.textMuted} />
              </View>
            </View>
          </Animated.View>
        )}

        {showKeywords && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
            <Text style={styles.label}>Keywords</Text>
            <TextInput
              style={styles.input}
              value={keywordsText}
              onChangeText={setKeywordsText}
              placeholder="urgent, emergency, help, SOS"
              placeholderTextColor={C.textMuted}
            />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
          <Text style={styles.label}>Linked Alerts</Text>
          <View style={styles.notifList}>
            {notifications.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => { Haptics.selectionAsync(); toggleNotif(n.id); }}
                style={[styles.notifItem, selectedNotifIds.includes(n.id) && styles.notifItemSelected]}
              >
                <Feather name={selectedNotifIds.includes(n.id) ? "check-square" : "square"} size={18} color={selectedNotifIds.includes(n.id) ? C.accent : C.textMuted} />
                <Text style={[styles.notifItemText, selectedNotifIds.includes(n.id) && { color: C.text }]}>
                  {n.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Enable Rule</Text>
            <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: C.border, true: C.accent + "80" }} thumbColor={enabled ? C.accent : C.textMuted} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ paddingTop: 8, paddingBottom: 8 }}>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Feather name="trash-2" size={18} color={C.accent} />
            <Text style={styles.deleteButtonText}>Delete Rule</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <ContactPickerModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelect={(contacts) => setSelectedContacts(contacts)}
        selectedNumbers={selectedContacts.map((c) => c.number)}
      />
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
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: { width: "47%", borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  typeCardGrad: { padding: 14, gap: 8, alignItems: "center" },
  typeCardLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowTwo: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1, gap: 6 },
  contactPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: C.accent + "40",
  },
  contactPickerBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  contactTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  contactTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accent + "20",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.accent + "40",
  },
  contactTagText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.accentLight },
  notifList: { gap: 8 },
  notifItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: 10, padding: 12 },
  notifItemSelected: { backgroundColor: C.accent + "22" },
  notifItemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 12, backgroundColor: C.accent + "15" },
  deleteButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.accent },
} as any);
