import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";
import { useSettingsStore } from "../stores/useSettingsStore";

type AppEventType = "app_open" | "page_view" | "quiz_start" | "quiz_complete";

interface AppEventProps {
  category_id?: number;
  path?: string;
  correct_count?: number;
  total_count?: number;
}

const DEVICE_KEY = "biquiz-device-id";

const uuid = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (Math.random() * 16) >> (Number(c) / 4)
    ).toString(16),
  );
};

export const getDeviceId = (): string => {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = uuid();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return uuid();
  }
};

const sessionId = uuid();
const enabled =
  import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_DEV === "true";

export const track = (event_type: AppEventType, props: AppEventProps = {}) => {
  if (!enabled) return;
  supabase
    .from("app_events")
    .insert({
      event_type,
      session_id: sessionId,
      device_id: getDeviceId(),
      locale: useSettingsStore.getState().language,
      platform: Capacitor.getPlatform(),
      ...props,
    })
    .then(({ error }) => {
      if (error) console.warn("[analytics]", error.message);
    });
};
