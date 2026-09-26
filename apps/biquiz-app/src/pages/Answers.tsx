import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonPage, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { checkboxSharp, checkmarkSharp, closeSharp, stopOutline } from 'ionicons/icons';
import { QuestionOption } from '@biquiz/shared';
import { useParams } from 'react-router-dom';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useQuestions } from '../queries/useQuestions';
import { useCategories } from '../queries/useCategories';
import ScriptureReference from '../components/ScriptureReference';
import { capitalizeFirstLetter, checkIsCorrect } from '../utils';
import { useSettingsStore } from '../stores/useSettingsStore';
import '../App.css';
import { useTranslation } from 'react-i18next';

const Answers: React.FC = () => {
  const { category_id = '' } = useParams<{ category_id: string }>();
  const attempt = useHistoryStore((s) => s.attempts[category_id]);
  const choices = attempt?.choices ?? [];
  const { data: allQuestions = [] } = useQuestions(category_id);
  const { data: categories = [] } = useCategories();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const categoryName = capitalizeFirstLetter(categories.find((c) => c.id === Number(category_id))?.name ?? '');
  const questions = [...choices]
    .reverse()
    .map((c) => allQuestions.find((q) => q.id === c.question_id))
    .filter((q): q is NonNullable<typeof q> => !!q);

  const getChoiceByQuestion = (question_id: number) => choices.find(c => c.question_id === question_id);

  const checkQuestionValidated = (question_id: number) => {
    const choice = getChoiceByQuestion(question_id);
    return choice ? checkIsCorrect(choice, questions) : false;
  };

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
        <div className="ion-padding-start">
          <IonText color="primary">
            <h4>{categoryName}</h4>
          </IonText>
        </div>
        {!attempt ? (
          <p className="ion-padding">{t('noAnswersYet')}</p>
        ) : (
          <>
            <IonItemDivider>
              <p className="m-0">
                {t('score')} : {choices.filter((item) => checkIsCorrect(item, questions)).length}/{choices.length}
                {' · '}
                {new Date(attempt.date).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </IonItemDivider>
            <IonList>
              {questions.map((item, idx) => {
                const chosenId = getChoiceByQuestion(item.id)?.choice_id;
                const answered = item.options.some((o) => o.id === chosenId);
                return (
                  <div key={item.id}>
                    <IonItem>
                      <IonIcon icon={checkQuestionValidated(item.id) ? checkmarkSharp : closeSharp} slot="end" color={checkQuestionValidated(item.id) ? "success" : "danger"} />
                      <div>
                        <h4>{t('question')} {idx + 1}</h4>
                        <p className="text-dimgray">{item.name}</p>
                        {!answered && <p className="text-dimgray"><em>{t('noAnswerGiven')}</em></p>}
                      </div>
                    </IonItem>
                    {item.options.map((option: QuestionOption) => (
                      <IonItem key={option.id}>
                        <IonIcon slot="start" icon={(option.is_correct || chosenId === option.id) ? checkboxSharp : stopOutline} color={option.is_correct ? "success" : chosenId === option.id ? "danger" : ""} />
                        <IonLabel color={option.is_correct ? "success" : chosenId === option.id ? "danger" : ""}>
                          {option.name}
                        </IonLabel>
                      </IonItem>
                    ))}
                    <IonItemDivider>
                      {t('source')} : <ScriptureReference reference={item.source_text} lang={language} />
                    </IonItemDivider>
                  </div>
                );
              })}
            </IonList>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Answers;
