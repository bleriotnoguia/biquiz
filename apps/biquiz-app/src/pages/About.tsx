import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  bookSharp,
  bulbOutline,
  codeSlashOutline,
  documentTextOutline,
  gridOutline,
  libraryOutline,
  lockOpenOutline,
  mailOutline,
  schoolOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  starOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/useSettingsStore';
import { STARS_PER_LEVEL } from '../utils';
import './About.css';

const DEV_EMAIL = 'contact@bleriotnoguia.com';
const DEV_URL = 'https://www.bleriotnoguia.com';
const APP_URL = 'https://biquiz.bleriotnoguia.com';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.bleriotnoguia.biquiz';
const BIBLE_URL = 'https://wol.jw.org';
const ICONS_URL = 'https://ionic.io/ionicons';

const openUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

const sendEmail = (subject: string, body: string) => {
  window.location.href = `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const About: React.FC = () => {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const quizLength = useSettingsStore((s) => s.quizLength);
  const [version, setVersion] = useState(__APP_VERSION__);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    App.getInfo()
      .then((info) => setVersion(info.version))
      .catch(() => {});
  }, []);

  const deviceInfo = `\n\n---\nBiquiz ${version} · ${Capacitor.getPlatform()} · ${language}`;

  const contactDev = () => sendEmail(t('contactSubject'), deviceInfo);

  const suggestQuestion = () => sendEmail(t('suggestSubject'), t('suggestTemplate') + deviceInfo);

  const shareApp = async () => {
    try {
      await Share.share({
        title: 'Biquiz',
        text: t('shareAppText') ?? '',
        url: APP_URL,
        dialogTitle: t('shareApp') ?? '',
      });
    } catch {
      // Share dismissed or unsupported on this platform.
    }
  };

  const howItWorks = [
    { icon: gridOutline, text: t('howToChoose', { count: quizLength }) },
    { icon: starOutline, text: t('howToStars') },
    { icon: lockOpenOutline, text: t('howToUnlock', { count: STARS_PER_LEVEL }) },
    { icon: schoolOutline, text: t('howToReview') },
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>{t('about')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="about-hero">
          <div className="about-logo">
            <IonIcon icon={bookSharp} />
          </div>
          <h1 className="about-name">Biquiz</h1>
          <p className="about-tagline">{t('aboutTagline')}</p>
          <span className="about-version">
            {t('versionApp')} {version}
          </span>
        </div>

        <IonList>
          <IonListHeader>
            <IonLabel>{t('howItWorks')}</IonLabel>
          </IonListHeader>
          {howItWorks.map((item) => (
            <IonItem key={item.text} lines="none">
              <IonIcon icon={item.icon} slot="start" color="primary" />
              <IonLabel className="ion-text-wrap about-howto">{item.text}</IonLabel>
            </IonItem>
          ))}

          <IonListHeader>
            <IonLabel>{t('aboutContact')}</IonLabel>
          </IonListHeader>
          <IonItem button onClick={contactDev}>
            <IonIcon icon={mailOutline} slot="start" />
            <IonLabel>
              <h3>{t('contactDev')}</h3>
              <p>{t('emailDev')}</p>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={suggestQuestion}>
            <IonIcon icon={bulbOutline} slot="start" />
            <IonLabel>
              <h3>{t('suggestQuestion')}</h3>
              <p>{t('suggestQuestionHint')}</p>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={() => openUrl(PLAY_STORE_URL)}>
            <IonIcon icon={sparklesOutline} slot="start" />
            <IonLabel>
              <h3>{t('rate')}</h3>
              <p>{t('rateApp')}</p>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={shareApp}>
            <IonIcon icon={shareSocialOutline} slot="start" />
            <IonLabel>
              <h3>{t('share')}</h3>
              <p>{t('shareApp')}</p>
            </IonLabel>
          </IonItem>

          <IonListHeader>
            <IonLabel>{t('aboutInfo')}</IonLabel>
          </IonListHeader>
          <IonItem button routerLink="/privacy">
            <IonIcon icon={shieldCheckmarkOutline} slot="start" />
            <IonLabel>
              <h3>{t('privacyRule')}</h3>
              <p>{t('privacyHint')}</p>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={() => openUrl(BIBLE_URL)}>
            <IonIcon icon={libraryOutline} slot="start" />
            <IonLabel>
              <h3>{t('creditBible')}</h3>
              <p>wol.jw.org</p>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={() => openUrl(DEV_URL)}>
            <IonIcon icon={codeSlashOutline} slot="start" />
            <IonLabel>
              <h3>{t('creditDev')}</h3>
              <p>Blériot Noguia</p>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={() => openUrl(ICONS_URL)}>
            <IonIcon icon={documentTextOutline} slot="start" />
            <IonLabel>
              <h3>{t('creditIcons')}</h3>
              <p>Ionicons</p>
            </IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default About;
