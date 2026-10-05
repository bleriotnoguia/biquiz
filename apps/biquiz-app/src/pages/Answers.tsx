import { useState } from 'react';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonPage, IonSegment, IonSegmentButton, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { checkmarkCircle, closeCircle } from 'ionicons/icons';
import { QuestionOption } from '@biquiz/shared';
import { useParams } from 'react-router-dom';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useQuestions } from '../queries/useQuestions';
import { useCategories } from '../queries/useCategories';
import ScriptureReference from '../components/ScriptureReference';
import { capitalizeFirstLetter, checkIsCorrect } from '../utils';
import { useSettingsStore } from '../stores/useSettingsStore';
import '../App.css';
import './Answers.css';
import { useTranslation } from 'react-i18next';

type Filter = 'all' | 'mistakes';

const Answers: React.FC = () => {
  const { category_id = '' } = useParams<{ category_id: string }>();
  const attempt = useHistoryStore((s) => s.attempts[category_id]);
  const choices = attempt?.choices ?? [];
  const { data: allQuestions = [] } = useQuestions(category_id);
  const { data: categories = [] } = useCategories();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [filter, setFilter] = useState<Filter>('all');
  const categoryName = capitalizeFirstLetter(categories.find((c) => c.id === Number(category_id))?.name ?? '');
  const questions = [...choices]
    .reverse()
    .map((c) => allQuestions.find((q) => q.id === c.question_id))
    .filter((q): q is NonNullable<typeof q> => !!q);

  const getChoiceByQuestion = (question_id: number) => choices.find(c => c.question_id === question_id);

  const checkQuestionValidated = (question_id: number) => {
    const choice = getChoiceByQuestion(question_id);
    return choice ? !!checkIsCorrect(choice, questions) : false;
  };

  const rows = questions.map((item, idx) => ({ item, number: idx + 1, correct: checkQuestionValidated(item.id) }));
  const mistakeCount = rows.filter((r) => !r.correct).length;
  const visibleRows = filter === 'mistakes' ? rows.filter((r) => !r.correct) : rows;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/progress" />
          </IonButtons>
          <IonTitle>{t('answers')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="answers-header">
          <IonText color="primary">
            <h2 className="answers-title">{categoryName}</h2>
          </IonText>
          {attempt && (
            <p className="answers-meta">
              {t('score')} : <strong>{choices.filter((c) => checkIsCorrect(c, questions)).length}/{choices.length}</strong>
              {' · '}
              {new Date(attempt.date).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        {!attempt ? (
          <p className="ion-padding">{t('noAnswersYet')}</p>
        ) : (
          <>
            <div className="answers-filter">
              <IonSegment value={filter} onIonChange={(e) => setFilter((e.detail.value as Filter) ?? 'all')}>
                <IonSegmentButton value="all">
                  <IonLabel>{t('filterAll')}</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="mistakes">
                  <IonLabel>{t('filterMistakes', { count: mistakeCount })}</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            {visibleRows.length === 0 && <p className="ion-padding answers-empty">{t('noMistakes')}</p>}

            {visibleRows.map(({ item, number, correct }) => {
              const chosenId = getChoiceByQuestion(item.id)?.choice_id;
              const answered = item.options.some((o) => o.id === chosenId);
              return (
                <section key={item.id} className={`answers-card ${correct ? 'is-correct' : 'is-wrong'}`}>
                  <div className="answers-card-head">
                    <span className="answers-number">{t('question')} {number}</span>
                    <IonIcon
                      icon={correct ? checkmarkCircle : closeCircle}
                      color={correct ? 'success' : 'danger'}
                      className="answers-result"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="answers-question">{item.name}</p>
                  {!answered && <p className="answers-noanswer">{t('noAnswerGiven')}</p>}

                  <ul className="answers-options">
                    {item.options.map((option: QuestionOption) => {
                      const chosen = chosenId === option.id;
                      const state = option.is_correct ? 'correct' : chosen ? 'wrong' : 'neutral';
                      return (
                        <li key={option.id} className={`answers-option is-${state}`}>
                          <span className="answers-option-icon">
                            {state === 'correct' && <IonIcon icon={checkmarkCircle} color="success" aria-label={t('correctAnswer') ?? ''} />}
                            {state === 'wrong' && <IonIcon icon={closeCircle} color="danger" />}
                          </span>
                          <span className="answers-option-text">
                            {option.name}
                            {chosen && <span className="answers-option-tag">{t('yourAnswer')}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {item.source_text && (
                    <p className="answers-source">
                      <span>{t('sourceLabel')}</span> <ScriptureReference reference={item.source_text} lang={language} />
                    </p>
                  )}
                </section>
              );
            })}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Answers;
