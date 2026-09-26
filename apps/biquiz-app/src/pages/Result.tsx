import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import {
  arrowBackSharp,
  arrowForwardSharp,
  eyeSharp,
  gridSharp,
  lockOpenSharp,
  refreshSharp,
  schoolSharp,
  shareSocialOutline,
  shareSocialSharp,
  trophySharp,
} from 'ionicons/icons';
import { Share } from '@capacitor/share';
import './Result.css';
import { useQuizStore } from '../stores/useQuizStore';
import { useScoresStore } from '../stores/useScoresStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useQuestions } from '../queries/useQuestions';
import { useCategories } from '../queries/useCategories';
import { useParams, useSearchParams } from 'react-router-dom';
import { useHistoryStore } from '../stores/useHistoryStore';
import {
  capitalizeFirstLetter,
  checkIsCorrect,
  computeStars,
  formatStars,
  getStars,
  roundToHalf,
  sortByLevel,
  starsRequired,
  sumStars,
} from '../utils';
import { useTranslation } from 'react-i18next';
import { track } from '../utils/analytics';

const resultTitleKey = (ratio: number) => {
  if (ratio === 1) return 'resultPerfect';
  if (ratio >= 0.8) return 'resultExcellent';
  if (ratio >= 0.6) return 'resultGood';
  if (ratio >= 0.4) return 'resultFair';
  return 'resultKeepGoing';
};

const Result: React.FC = () => {
  const choices = useQuizStore((s) => s.choices);
  const deleteChoices = useQuizStore((s) => s.deleteChoices);
  const lastResult = useQuizStore((s) => s.lastResult);
  const scores = useScoresStore((s) => s.data);
  const language = useSettingsStore((s) => s.language);
  const { category_id = '' } = useParams<{ category_id: string }>();
  const [searchParams] = useSearchParams();
  const isReview = searchParams.get('mode') === 'review';
  const remainingMistakes = useHistoryStore((s) => s.attempts[category_id]?.mistakeIds.length ?? 0);
  const { data: questions = [] } = useQuestions(category_id);
  const { data: categories = [] } = useCategories();
  const { t } = useTranslation();
  const router = useIonRouter();

  const correctCount = choices.filter((item) => checkIsCorrect(item, questions)).length;
  const total = choices.length;
  const stars = computeStars(correctCount, total);

  const sorted = sortByLevel(categories);
  const currentIndex = sorted.findIndex((c) => c.id === Number(category_id));
  const category = sorted[currentIndex];
  const categoryName = capitalizeFirstLetter(category?.name ?? '');
  const nextCategory = currentIndex >= 0 ? sorted[currentIndex + 1] : undefined;

  const totalStars = sumStars(scores);
  const previousBest = lastResult?.previousBest != null ? roundToHalf(lastResult.previousBest) : null;
  const isNewRecord = previousBest !== null && stars > previousBest;
  const newlyUnlocked = lastResult
    ? sorted.filter(
        (c) => lastResult.previousTotalStars < starsRequired(c.level) && totalStars >= starsRequired(c.level),
      )
    : [];
  const nextIsUnlocked = nextCategory ? totalStars >= starsRequired(nextCategory.level) : false;
  const missingForNext = nextCategory ? starsRequired(nextCategory.level) - totalStars : 0;

  const startQuiz = (id: number | string) => {
    deleteChoices();
    track('quiz_start', { category_id: Number(id) });
    router.push(`/page/quiz/category/${id}`, 'forward', 'replace');
  };

  const startReview = () => {
    deleteChoices();
    router.push(`/page/quiz/category/${category_id}?mode=review`, 'forward', 'replace');
  };

  const shareScore = async () => {
    try {
      await Share.share({
        title: 'Biquiz',
        text: t('shareScoreText', { correct: correctCount, total, theme: categoryName }) ?? '',
        url: 'https://biquiz.bleriotnoguia.com',
        dialogTitle: t('share') ?? '',
      });
    } catch {
      // Share dismissed or unsupported on this platform.
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonButton routerLink="/" routerDirection="root" aria-label={t('backToThemes') ?? ''}>
              <IonIcon slot="icon-only" icon={arrowBackSharp} />
            </IonButton>
          </IonButtons>
          <IonTitle>{isReview ? t('reviewMistakes') : t('result')}</IonTitle>
          {!isReview && (
            <IonButtons slot="end">
              <IonButton onClick={shareScore} aria-label={t('share') ?? ''}>
                <IonIcon slot="icon-only" ios={shareSocialOutline} md={shareSocialSharp} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="result-content">
        {/* Hero section */}
        <div className="result-hero">
          {categoryName && <p className="result-theme-name">{categoryName}</p>}
          <div className="result-score-circle">
            <span className="result-score-number">{correctCount}</span>
            <span className="result-score-total">/ {total}</span>
          </div>
          {!isReview && <div className="result-stars">{getStars(stars)}</div>}
          {!isReview && isNewRecord && (
            <span className="result-record-badge">
              <IonIcon icon={trophySharp} /> {t('newRecord')}
            </span>
          )}
          {!isReview && !isNewRecord && previousBest !== null && (
            <span className="result-record-badge muted">
              {t('bestScore', { stars: formatStars(previousBest, language) })}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="result-body">
          {isReview ? (
            <div className="result-message-card">
              <h2 className="result-message-title">{t('reviewDone')}</h2>
              <p className="result-message-desc">{t('reviewScore', { count: correctCount, total })}</p>
              <p className="result-message-desc">
                {remainingMistakes > 0 ? t('mistakesLeft', { count: remainingMistakes }) : t('noMistakesLeft')}
              </p>
            </div>
          ) : (
            <div className="result-message-card">
              <h2 className="result-message-title">{t(resultTitleKey(total > 0 ? correctCount / total : 0))}</h2>
              <p className="result-message-desc">
                {t('resultScore', { count: correctCount, total })}
              </p>
            </div>
          )}

          {!isReview && newlyUnlocked.length > 0 && (
            <div className="result-unlock-card">
              <IonIcon icon={lockOpenSharp} className="result-unlock-icon" />
              <div>
                <p className="result-unlock-title">
                  {t('themeUnlocked', { count: newlyUnlocked.length })}
                </p>
                <p className="result-unlock-names">
                  {newlyUnlocked.map((c) => capitalizeFirstLetter(c.name)).join(', ')}
                </p>
              </div>
            </div>
          )}

          {!isReview && nextCategory && !nextIsUnlocked && (
            <p className="result-next-hint">
              {t('nextThemeHint', {
                missing: formatStars(missingForNext, language),
                theme: capitalizeFirstLetter(nextCategory.name),
              })}
            </p>
          )}

          <div className="result-actions">
            {!isReview && nextCategory && nextIsUnlocked && (
              <IonButton expand="block" className="result-btn" color="primary" onClick={() => startQuiz(nextCategory.id)}>
                {t('nextTheme')}
                <IonIcon icon={arrowForwardSharp} slot="end" />
              </IonButton>
            )}
            {isReview && remainingMistakes > 0 && (
              <IonButton expand="block" className="result-btn" color="primary" onClick={startReview}>
                <IonIcon icon={schoolSharp} slot="start" />
                {t('reviewRemaining', { count: remainingMistakes })}
              </IonButton>
            )}
            <IonButton
              expand="block"
              className="result-btn"
              fill={(!isReview && nextCategory && nextIsUnlocked) || (isReview && remainingMistakes > 0) ? 'outline' : 'solid'}
              color="primary"
              onClick={() => startQuiz(category_id)}
            >
              <IonIcon icon={refreshSharp} slot="start" />
              {isReview ? t('replayFullQuiz') : t('replay')}
            </IonButton>
            {!isReview && remainingMistakes > 0 && (
              <IonButton expand="block" className="result-btn" fill="outline" color="primary" onClick={startReview}>
                <IonIcon icon={schoolSharp} slot="start" />
                {t('reviewMistakesCount', { count: remainingMistakes })}
              </IonButton>
            )}
            {!isReview && (
              <IonButton
                expand="block"
                className="result-btn"
                fill="outline"
                color="primary"
                routerLink={`/page/answers/${category_id}`}
              >
                <IonIcon icon={eyeSharp} slot="start" />
                {t('displayAnswers')}
              </IonButton>
            )}
            <IonButton expand="block" className="result-btn" fill="clear" color="primary" routerLink="/" routerDirection="root">
              <IonIcon icon={gridSharp} slot="start" />
              {t('backToThemes')}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Result;
