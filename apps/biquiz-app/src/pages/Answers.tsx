import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonPage, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { checkboxSharp, checkmarkSharp, closeSharp, stopOutline } from 'ionicons/icons';
import { Choice, QuestionOption } from '@biquiz/shared';
import { useQuizStore } from '../stores/useQuizStore';
import { useQuestions } from '../queries/useQuestions';
import ScriptureReference from '../components/ScriptureReference';
import { checkIsCorrect } from '../utils';
import { useSettingsStore } from '../stores/useSettingsStore';
import '../App.css';
import { useTranslation } from 'react-i18next';

const Answers: React.FC = () => {
  const choices = useQuizStore((s) => s.choices);
  const categoryId = useQuizStore((s) => s.categoryId);
  const { data: allQuestions = [] } = useQuestions(categoryId);
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const questions = [...choices]
    .reverse()
    .map((c) => allQuestions.find((q) => q.id === c.question_id))
    .filter((q): q is NonNullable<typeof q> => !!q);

  const checkQuestionValidated = (question_id: number) => {
    const question = questions.find(q => q.id === question_id);
    const choice = choices.find(c => c.question_id === question_id);
    const questionOption = question?.options.find(c => c.id === choice?.choice_id);
    return questionOption?.is_correct;
  };

  const getChoiceByQuestion = (question_id: number) => {
    return choices.find(c => c.question_id === question_id);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>{t('result')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="ion-padding-start">
          <IonText color="primary">
            <h4>{t('answers')}</h4>
          </IonText>
        </div>
        <IonItemDivider>
          <p className="m-0">Score : {choices.filter((item: Choice) => checkIsCorrect(item, questions)).length}/{choices.length}</p>
        </IonItemDivider>
        <IonList>
          {questions.map((item, idx) => (
            <div key={idx}>
              <IonItem>
                <IonIcon icon={checkQuestionValidated(item.id) ? checkmarkSharp : closeSharp} slot="end" color={checkQuestionValidated(item.id) ? "success" : "danger"} />
                <div>
                  <h4>Question {idx + 1}</h4>
                  <p className="text-dimgray">{item.name}</p>
                </div>
              </IonItem>
              {item.options.map((option: QuestionOption, index: number) => (
                <IonItem key={index}>
                  <IonIcon slot="start" icon={(option.is_correct || (getChoiceByQuestion(item.id)?.choice_id === option.id)) ? checkboxSharp : stopOutline} color={option.is_correct ? "success" : (getChoiceByQuestion(item.id)?.choice_id === option.id) ? "danger" : ""} />
                  <IonLabel color={option.is_correct ? "success" : (getChoiceByQuestion(item.id)?.choice_id === option.id) ? "danger" : ""}>
                    {option.name}
                  </IonLabel>
                </IonItem>
              ))}
              <IonItemDivider>
                Source : <ScriptureReference reference={item.source_text} lang={language} />
              </IonItemDivider>
            </div>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Answers;
