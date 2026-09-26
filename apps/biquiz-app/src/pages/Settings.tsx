import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonList,
  IonListHeader,
  IonLabel,
  IonToggle,
  IonAlert,
  IonSelect,
  IonSelectOption,
  IonToast,
} from "@ionic/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { FontSize, ThemeMode, useSettingsStore } from "../stores/useSettingsStore";
import { useScoresStore } from "../stores/useScoresStore";
import { useHistoryStore } from "../stores/useHistoryStore";
import { cancelReminder, remindersSupported, scheduleReminder } from "../utils/reminder";
import "./Settings.css";

const QUIZ_LENGTHS = [10, 20, 30];
const TIMER_DURATIONS = [10, 20, 30];
const REMINDER_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

const Settings: React.FC = () => {
  const settings = useSettingsStore();
  const resetProgress = useScoresStore((s) => s.resetProgress);
  const clearHistory = useHistoryStore((s) => s.clear);
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [toast, setToast] = useState<string>();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    settings.setLanguage(lang);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    if (settings.reminderEnabled) void scheduleReminder(settings.reminderHour);
  };

  const updateReminder = async (enabled: boolean, hour: number) => {
    if (!enabled) {
      settings.setReminder(false, hour);
      await cancelReminder();
      return;
    }
    const scheduled = await scheduleReminder(hour);
    settings.setReminder(scheduled, hour);
    if (!scheduled) setToast(t("reminderPermissionDenied") ?? "");
  };

  const formatHour = (hour: number) =>
    new Date(2000, 0, 1, hour).toLocaleTimeString(settings.language, { hour: "2-digit", minute: "2-digit" });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>{t("settings")}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonList>
          <IonListHeader>
            <IonLabel>{t("settingsGame")}</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonSelect
              label={t("quizLength") ?? ""}
              value={settings.quizLength}
              onIonChange={(e) => settings.setQuizLength(e.detail.value)}
            >
              {QUIZ_LENGTHS.map((n) => (
                <IonSelectOption key={n} value={n}>
                  {t("questionsCount", { count: n })}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonToggle
              checked={settings.timerEnabled}
              onIonChange={(e) => settings.setTimerEnabled(e.detail.checked)}
            >
              <IonLabel>
                {t("timer")}
                <p>{t("timerHint")}</p>
              </IonLabel>
            </IonToggle>
          </IonItem>
          {settings.timerEnabled && (
            <IonItem>
              <IonSelect
                label={t("timerDuration") ?? ""}
                value={settings.timerSeconds}
                onIonChange={(e) => settings.setTimerSeconds(e.detail.value)}
              >
                {TIMER_DURATIONS.map((s) => (
                  <IonSelectOption key={s} value={s}>
                    {t("secondsCount", { count: s })}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          )}
          <IonItem>
            <IonToggle checked={settings.autoNext} onIonChange={(e) => settings.setAutoNext(e.detail.checked)}>
              <IonLabel>
                {t("autoNext")}
                <p>{t("autoNextHint")}</p>
              </IonLabel>
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonToggle
              checked={settings.displaySource}
              onIonChange={(e) => settings.setDisplaySource(e.detail.checked)}
            >
              {t("displaySourceInQuiz")}
            </IonToggle>
          </IonItem>

          <IonListHeader>
            <IonLabel>{t("settingsDisplay")}</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonSelect
              label={t("langOption") ?? ""}
              value={settings.language}
              onIonChange={(e) => changeLanguage(e.detail.value)}
            >
              <IonSelectOption value="fr">{t("french")}</IonSelectOption>
              <IonSelectOption value="en">{t("english")}</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonSelect
              label={t("themeOption") ?? ""}
              value={settings.theme}
              onIonChange={(e) => settings.setTheme(e.detail.value as ThemeMode)}
            >
              <IonSelectOption value="light">{t("themeLight")}</IonSelectOption>
              <IonSelectOption value="dark">{t("themeDark")}</IonSelectOption>
              <IonSelectOption value="system">{t("themeSystem")}</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonSelect
              label={t("fontSize") ?? ""}
              value={settings.fontSize}
              onIonChange={(e) => settings.setFontSize(e.detail.value as FontSize)}
            >
              <IonSelectOption value="normal">{t("fontSizeNormal")}</IonSelectOption>
              <IonSelectOption value="large">{t("fontSizeLarge")}</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonListHeader>
            <IonLabel>{t("settingsFeedback")}</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonToggle checked={settings.sounds} onIonChange={(e) => settings.setSounds(e.detail.checked)}>
              {t("sounds")}
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonToggle checked={settings.haptics} onIonChange={(e) => settings.setHaptics(e.detail.checked)}>
              {t("haptics")}
            </IonToggle>
          </IonItem>

          {remindersSupported() && (
            <>
              <IonListHeader>
                <IonLabel>{t("settingsReminder")}</IonLabel>
              </IonListHeader>
              <IonItem>
                <IonToggle
                  checked={settings.reminderEnabled}
                  onIonChange={(e) => updateReminder(e.detail.checked, settings.reminderHour)}
                >
                  <IonLabel>
                    {t("dailyReminder")}
                    <p>{t("dailyReminderHint")}</p>
                  </IonLabel>
                </IonToggle>
              </IonItem>
              {settings.reminderEnabled && (
                <IonItem>
                  <IonSelect
                    label={t("reminderTime") ?? ""}
                    value={settings.reminderHour}
                    onIonChange={(e) => updateReminder(true, e.detail.value)}
                  >
                    {REMINDER_HOURS.map((h) => (
                      <IonSelectOption key={h} value={h}>
                        {formatHour(h)}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              )}
            </>
          )}

          <IonListHeader>
            <IonLabel>{t("settingsData")}</IonLabel>
          </IonListHeader>
          <IonItem button detail={false} onClick={() => setShowResetAlert(true)}>
            <IonLabel color="danger">{t("resetProgress")}</IonLabel>
          </IonItem>
        </IonList>

        <IonAlert
          isOpen={showResetAlert}
          onDidDismiss={() => setShowResetAlert(false)}
          header={t("resetProgress") ?? ""}
          message={t("resetProgressConfirm") ?? ""}
          buttons={[
            { text: t("no") ?? "", role: "cancel" },
            {
              text: t("yes") ?? "",
              role: "destructive",
              handler: () => {
                resetProgress();
                clearHistory();
              },
            },
          ]}
        />
        <IonToast isOpen={!!toast} message={toast} duration={3000} onDidDismiss={() => setToast(undefined)} />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
