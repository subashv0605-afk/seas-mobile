import { Audio } from "expo-av";
import { Platform } from "react-native";

let soundObject: Audio.Sound | null = null;
let isPlaying = false;

export async function setupAudio() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.warn("[AudioService] Setup failed:", e);
  }
}

export async function playAlarmSound() {
  if (isPlaying) return;

  try {
    await setupAudio();

    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3" },
      {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
        isMuted: false,
        rate: 1.0,
        shouldCorrectPitch: true,
      }
    );

    soundObject = sound;
    isPlaying = true;

    if (Platform.OS === "android") {
      await sound.setVolumeAsync(1.0);
    }
  } catch (e) {
    console.warn("[AudioService] Play failed:", e);
  }
}

export async function stopAlarmSound() {
  if (!isPlaying || !soundObject) return;
  try {
    await soundObject.stopAsync();
    await soundObject.unloadAsync();
    soundObject = null;
    isPlaying = false;
  } catch (e) {
    console.warn("[AudioService] Stop failed:", e);
  }
}

export function isAlarmPlaying() {
  return isPlaying;
}
