import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import i18next from "i18next";

const REMINDER_ID = 1;

export const remindersSupported = () => Capacitor.isNativePlatform();

export const cancelReminder = async () => {
  if (!remindersSupported()) return;
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
};

// Resolves to false when the user refuses the notification permission.
export const scheduleReminder = async (hour: number): Promise<boolean> => {
  if (!remindersSupported()) return false;
  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return false;
  await cancelReminder();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: i18next.t("reminderNotificationTitle"),
        body: i18next.t("reminderNotificationBody"),
        schedule: { on: { hour, minute: 0 } },
      },
    ],
  });
  return true;
};
