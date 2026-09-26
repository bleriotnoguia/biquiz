import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { lockClosed, starSharp } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../queries/useCategories';
import { useQuizStore } from '../stores/useQuizStore';
import { useScoresStore } from '../stores/useScoresStore';
import { track } from '../utils/analytics';
import { useSettingsStore } from '../stores/useSettingsStore';
import { capitalizeFirstLetter, formatStars, getStars, sortByLevel, starsRequired, sumStars } from '../utils';
import './Progress.css';

const Progress: React.FC = () => {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const scores = useScoresStore((s) => s.data);
  const deleteChoices = useQuizStore((s) => s.deleteChoices);
  const { data: categories = [] } = useCategories();
  const router = useIonRouter();

  const sorted = sortByLevel(categories);
  const totalStars = sumStars(scores);
  const maxStars = sorted.length * 5;
  const nextLocked = sorted.find((c) => totalStars < starsRequired(c.level));

  const startQuiz = (id: number) => {
    deleteChoices();
    track('quiz_start', { category_id: id });
    router.push(`/page/quiz/category/${id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>{t('myProgress')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="progress-summary">
          <div className="progress-total">
            <span className="progress-total-number">{formatStars(totalStars, language)}</span>
            <span className="progress-total-max">/ {maxStars}</span>
            <IonIcon icon={starSharp} className="progress-total-star" />
          </div>
          {nextLocked ? (
            <>
              <IonProgressBar
                className="progress-bar"
                value={Math.min(totalStars / starsRequired(nextLocked.level), 1)}
              />
              <p className="progress-next">
                {t('nextThemeHint', {
                  missing: formatStars(starsRequired(nextLocked.level) - totalStars, language),
                  theme: capitalizeFirstLetter(nextLocked.name),
                })}
              </p>
            </>
          ) : (
            sorted.length > 0 && <p className="progress-next">{t('allThemesUnlocked')}</p>
          )}
        </div>

        <IonList>
          {sorted.map((category) => {
            const required = starsRequired(category.level);
            const isLock = totalStars < required;
            const stars = scores.find((s) => parseInt(s.category_id) === category.id)?.stars ?? 0;
            return (
              <IonItem
                key={category.id}
                button={!isLock}
                detail={!isLock}
                onClick={isLock ? undefined : () => startQuiz(category.id)}
              >
                <IonLabel>
                  <h2>
                    {capitalizeFirstLetter(category.name)}
                    {isLock && <IonIcon icon={lockClosed} className="progress-lock" />}
                  </h2>
                  {isLock ? (
                    <p>{t('lockedTitle', { count: required })}</p>
                  ) : (
                    <p className="progress-stars">{getStars(stars)}</p>
                  )}
                </IonLabel>
              </IonItem>
            );
          })}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Progress;
