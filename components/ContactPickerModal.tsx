import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const C = Colors.light;

type ContactItem = {
  id: string;
  name: string;
  phoneNumbers: string[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (contacts: { name: string; number: string }[]) => void;
  selectedNumbers?: string[];
};

export default function ContactPickerModal({
  visible,
  onClose,
  onSelect,
  selectedNumbers = [],
}: Props) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedNumbers));

  useEffect(() => {
    if (visible) {
      loadContacts();
      setSelected(new Set(selectedNumbers));
    }
  }, [visible]);

  const loadContacts = async () => {
    if (Platform.OS === "web") {
      setContacts([]);
      return;
    }
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      setPermissionDenied(false);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      const mapped: ContactItem[] = data
        .filter((c) => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
        .map((c) => ({
          id: c.id ?? c.name ?? Math.random().toString(),
          name: c.name ?? "",
          phoneNumbers: (c.phoneNumbers ?? []).map((p) => p.number ?? "").filter(Boolean),
        }));
      setContacts(mapped);
    } catch (e) {
      console.warn("[ContactPicker] Error loading:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phoneNumbers.some((p) => p.includes(search))
      )
    : contacts;

  const toggleContact = useCallback((phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) {
        next.delete(phone);
      } else {
        next.add(phone);
      }
      return next;
    });
  }, []);

  const handleConfirm = () => {
    const result = contacts
      .filter((c) => c.phoneNumbers.some((p) => selected.has(p)))
      .map((c) => {
        const number = c.phoneNumbers.find((p) => selected.has(p)) ?? c.phoneNumbers[0];
        return { name: c.name, number };
      });
    onSelect(result);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={C.textSecondary} />
          </Pressable>
          <Text style={styles.title}>Select Contacts</Text>
          <Pressable
            onPress={handleConfirm}
            style={[styles.doneBtn, { opacity: selected.size > 0 ? 1 : 0.5 }]}
          >
            <Text style={styles.doneBtnText}>
              Done{selected.size > 0 ? ` (${selected.size})` : ""}
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts..."
            placeholderTextColor={C.textMuted}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x-circle" size={16} color={C.textMuted} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="contacts" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Contacts Permission Denied</Text>
            <Text style={styles.emptySubtitle}>
              Go to Settings → SEAS → Contacts and allow access.
            </Text>
            <Pressable style={styles.retryBtn} onPress={loadContacts}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : Platform.OS === "web" ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="contacts" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Contacts not available on web</Text>
            <Text style={styles.emptySubtitle}>
              Use the EAS build to access real contacts on your phone.
            </Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="contacts" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No Contacts Found</Text>
            <Text style={styles.emptySubtitle}>
              Your contacts will appear here after permission is granted.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => {
              const primaryNumber = item.phoneNumbers[0];
              const isSelected = item.phoneNumbers.some((p) => selected.has(p));
              return (
                <Pressable
                  style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                  onPress={() => toggleContact(primaryNumber)}
                >
                  <View style={[styles.avatar, { backgroundColor: isSelected ? C.accent : C.surface }]}>
                    <Text style={[styles.avatarText, { color: isSelected ? "#fff" : C.textSecondary }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone} numberOfLines={1}>
                      {item.phoneNumbers.slice(0, 2).join(" • ")}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check-circle" size={20} color={C.accent} />
                  )}
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.surface,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  doneBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surface,
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.surface + "88",
  },
  contactRowSelected: {
    backgroundColor: C.accent + "10",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  contactPhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
