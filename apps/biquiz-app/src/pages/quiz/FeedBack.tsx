import React from 'react';
import { IonModal, IonIcon, IonButton } from '@ionic/react';
import { checkmarkCircle, closeCircleSharp } from 'ionicons/icons';
import './FeedBack.css';
import { QuestionOption } from '@biquiz/shared';
import { useTranslation } from 'react-i18next';

interface Props {
  handleCloseModal: () => void;
  nextQuiz: () => void;
  onReport: () => void;
  reported: boolean;
  isOpen: boolean;
  feedback: { goodAnswer: QuestionOption; success: boolean } | undefined;
}

const FeedBack: React.FC<Props> = ({ isOpen, feedback, nextQuiz, onReport, reported }) => {
  const { t } = useTranslation();

  return (
    <IonModal backdropDismiss={false} isOpen={isOpen} id="feedback-modal">
      <div className="feedback-wrapper">
        <div className="feedback-header">
          <div className={`feedback-icon ${feedback?.success ? 'success' : 'danger'}`}>
            <IonIcon icon={feedback?.success ? checkmarkCircle : closeCircleSharp} />
          </div>
          <div className="feedback-text">
            {feedback?.success ? (
              <>
                <h2>{t('goodAnswer')}</h2>
                <p>Continuez comme ça !</p>
              </>
            ) : (
              <>
                <h4>{t('theGoodAnswerIs')}{feedback?.goodAnswer.name}</h4>
                <p>Vous ferez mieux la prochaine fois !</p>
              </>
            )}
          </div>
        </div>

        <IonButton
          className="feedback-continue-btn"
          expand="block"
          color={feedback?.success ? 'success' : 'danger'}
          onClick={nextQuiz}
        >
          {t('continue')}
        </IonButton>
        {!reported && (
          <button type="button" className="feedback-report-link" onClick={onReport}>
            {t('reportError')}
          </button>
        )}
      </div>
    </IonModal>
  );
};

export default FeedBack;
