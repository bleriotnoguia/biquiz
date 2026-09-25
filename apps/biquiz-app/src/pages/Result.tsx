import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { eyeSharp, refreshSharp } from 'ionicons/icons';
import './Result.css';
import { useQuizStore } from '../stores/useQuizStore';
import { useQuestions } from '../queries/useQuestions';
import { useHistory, useParams } from 'react-router-dom';
import { checkIsCorrect, getStars } from '../utils';
import { useTranslation } from 'react-i18next';
import { track } from '../utils/analytics';

const Result: React.FC = () => {
  const choices = useQuizStore((s) => s.choices);
  const deleteChoices = useQuizStore((s) => s.deleteChoices);
  const { category_id } = useParams<{ category_id: string }>();
  const { data: questions = [] } = useQuestions(category_id);
  const { t } = useTranslation();
  const history = useHistory();

  const correctCount = choices.filter((item) => checkIsCorrect(item, questions)).length;
  const total = choices.length;
  const stars = total > 0 ? (correctCount * 5) / total : 0;

  const replay = () => {
    deleteChoices();
    track('quiz_start', { category_id: Number(category_id) });
    history.push(`/page/quiz/category/${category_id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{t('result')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="result-content">
        {/* Hero section */}
        <div className="result-hero">
          <div className="result-score-circle">
            <span className="result-score-number">{correctCount}</span>
            <span className="result-score-total">/ {total}</span>
          </div>
          <div className="result-stars">{getStars(stars)}</div>
        </div>

        {/* Body */}
        <div className="result-body">
          <div className="result-message-card">
            <h2 className="result-message-title">{t('resultTitle')}</h2>
            <p className="result-message-desc">
              {t('resultDescription1')} <strong>{total}</strong> {t('resultDescription2')}{' '}
              <strong>{correctCount}</strong> {t('resultDescription3')}
            </p>
          </div>

          <div className="result-actions">
            <IonButton expand="block" className="result-btn" color="primary" onClick={replay}>
              <IonIcon icon={refreshSharp} slot="start" />
              {t('replay')}
            </IonButton>
            <IonButton expand="block" className="result-btn" fill="outline" color="primary" routerLink="/page/answers">
              <IonIcon icon={eyeSharp} slot="start" />
              {t('displayAnswers')}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Result;
