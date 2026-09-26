import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewDidEnter,
  useIonViewWillLeave,
} from "@ionic/react";
import { arrowBackSharp, checkmarkCircle, closeCircle, flagOutline } from "ionicons/icons";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { QuestionOption } from "@biquiz/shared";
import { useQuestions } from "../../queries/useQuestions";
import { useQuizStore } from "../../stores/useQuizStore";
import { useScoresStore } from "../../stores/useScoresStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import ScriptureReference from "../../components/ScriptureReference";
import { arrangeOptions, checkIsCorrect, computeStars, shuffle, sumStars } from "../../utils";
import { track } from "../../utils/analytics";
import { rememberReportedQuestion, reportedQuestionIds } from "../../utils/reports";
import QuizLoading from "../home/QuizLoading";
import FeedBack from "./FeedBack";
import ReportQuestion from "./ReportQuestion";
import "./Quiz.css";

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const QUIZ_LENGTH = 20;

const Quiz: React.FC = () => {
  const displaySource = useSettingsStore((s) => s.displaySource);
  const language = useSettingsStore((s) => s.language);
  const { choices, addChoice, setCategoryId, deleteChoices, setLastResult } = useQuizStore();
  const { category_id = '' } = useParams<{ category_id: string }>();
  const { data, isLoading } = useQuestions(category_id);
  // Memoized on the query data so a background refetch with identical content keeps the order.
  const questions = useMemo(
    () =>
      shuffle(data ?? [])
        .slice(0, QUIZ_LENGTH)
        .map((q) => ({ ...q, options: arrangeOptions(q) })),
    [data]
  );
  const setScore = useScoresStore((s) => s.setScore);
  const scores = useScoresStore((s) => s.data);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [choiceId, setChoiceId] = useState<undefined | number>(undefined);
  const [feedBackIsOpen, setFeedBackIsOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportedIds, setReportedIds] = useState<number[]>(() => reportedQuestionIds());
  const [feedback, setFeedBack] = useState<{ goodAnswer: QuestionOption; success: boolean }>();
  const [confirmQuitOpen, setConfirmQuitOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const { t } = useTranslation();
  const router = useIonRouter();

  useEffect(() => {
    setCategoryId(category_id);
  }, [category_id, setCategoryId]);

  useIonViewDidEnter(() => setIsActive(true));
  useIonViewWillLeave(() => setIsActive(false));

  const quit = () => {
    deleteChoices();
    if (router.canGoBack()) router.goBack();
    else router.push('/', 'root', 'replace');
  };

  const requestQuit = () => {
    if (choices.length > 0) setConfirmQuitOpen(true);
    else quit();
  };

  // Android hardware back button: ask before abandoning a quiz in progress.
  useEffect(() => {
    if (!isActive) return;
    const handler = (ev: Event) =>
      (ev as CustomEvent<{ register: (priority: number, cb: () => void) => void }>).detail.register(10, requestQuit);
    document.addEventListener('ionBackButton', handler);
    return () => document.removeEventListener('ionBackButton', handler);
  });

  function handleSelectOption(optionId: number) {
    if (!questions || questions.length === 0 || !questions[questionIndex] || choiceId !== undefined) return;

    const newChoice = { question_id: questions[questionIndex].id, choice_id: optionId };
    setChoiceId(optionId);
    addChoice(newChoice);

    const currentQuestion = questions.find(q => q.id === questions[questionIndex].id);
    const isGoodAnswer = currentQuestion?.options.find(opt => opt.id === optionId)?.is_correct ?? false;
    const goodAnswer = currentQuestion?.options.find(opt => opt.is_correct === true)!;

    setFeedBack({ goodAnswer, success: isGoodAnswer });
    setFeedBackIsOpen(true);
  }

  function nextQuiz() {
    const nextQuizIndex = questionIndex + 1;
    if (nextQuizIndex < questions.length) {
      setQuestionIndex(nextQuizIndex);
    } else {
      const correct_count = choices.filter((item) => checkIsCorrect(item, questions)).length;
      const stars_won = computeStars(correct_count, choices.length);
      track('quiz_complete', {
        category_id: Number(category_id),
        correct_count,
        total_count: choices.length,
      });
      const category_score = scores.length ? scores.find(s => s.category_id === category_id) : undefined;
      setLastResult({
        previousBest: category_score ? category_score.stars : null,
        previousTotalStars: sumStars(scores),
      });
      if (!category_score || category_score.stars < stars_won) {
        setScore({ category_id, stars: stars_won });
      }
      setQuestionIndex(0);
      router.push('/page/result/' + category_id, 'forward', 'replace');
    }
    setFeedBackIsOpen(false);
    setChoiceId(undefined);
    setShowSource(false);
  }

  const currentQuestion = questions[questionIndex];

  const getOptionClass = (option: QuestionOption) => {
    if (choiceId === undefined) return 'quiz-option';
    if (option.is_correct) return 'quiz-option correct disabled';
    if (choiceId === option.id) return 'quiz-option wrong disabled';
    return 'quiz-option disabled';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonButton onClick={requestQuit} aria-label={t('backToThemes') ?? ''}>
              <IonIcon slot="icon-only" icon={arrowBackSharp} />
            </IonButton>
          </IonButtons>
          <IonTitle>Quiz</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {isLoading ? (
          <QuizLoading />
        ) : (
          <>
            {/* Progress bar */}
            <div className="quiz-progress-wrapper">
              <div className="quiz-progress-label">
                <span>{t('progress')}</span>
                <span>{questionIndex + 1} / {questions.length}</span>
              </div>
              <IonProgressBar value={questions.length > 0 ? questionIndex / questions.length : 0} />
            </div>

            {/* Question card */}
            <div className="quiz-question-card">
              <div className="quiz-question-counter">
                <span className="quiz-question-badge">{t('question')} {questionIndex + 1}</span>
                {currentQuestion && (
                  <button
                    type="button"
                    className="quiz-report-icon"
                    aria-label={(reportedIds.includes(currentQuestion.id) ? t("reportSent") : t("reportError")) ?? ""}
                    disabled={reportedIds.includes(currentQuestion.id)}
                    onClick={() => setReportOpen(true)}
                  >
                    <IonIcon icon={reportedIds.includes(currentQuestion.id) ? checkmarkCircle : flagOutline} />
                  </button>
                )}
              </div>
              <p className="quiz-question-text">
                {currentQuestion?.name ?? ''}
              </p>
              {displaySource && (
                <>
                  <IonButton
                    className="quiz-source-btn"
                    fill="outline"
                    size="small"
                    onClick={() => setShowSource(!showSource)}
                  >
                    {showSource ? t('hideSource') : t('displaySource')}
                  </IonButton>
                  {showSource && (
                    <p className="quiz-source-text">
                      <ScriptureReference reference={currentQuestion?.source_text ?? ""} lang={language} />
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Answer options */}
            <div className="quiz-options">
              {currentQuestion?.options.map((option, idx) => (
                <div
                  key={option.id}
                  className={getOptionClass(option)}
                  onClick={() => handleSelectOption(option.id)}
                >
                  <span className="quiz-option-letter">{LETTERS[idx]}</span>
                  <span className="quiz-option-text">{option.name}</span>
                  {choiceId !== undefined && option.is_correct && (
                    <IonIcon className="quiz-option-icon" color="success" icon={checkmarkCircle} />
                  )}
                  {choiceId !== undefined && choiceId === option.id && !option.is_correct && (
                    <IonIcon className="quiz-option-icon" color="danger" icon={closeCircle} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </IonContent>

      <FeedBack
        feedback={feedback}
        handleCloseModal={() => setFeedBackIsOpen(false)}
        isOpen={feedBackIsOpen}
        nextQuiz={nextQuiz}
        reported={currentQuestion ? reportedIds.includes(currentQuestion.id) : false}
        onReport={() => setReportOpen(true)}
      />
      <IonAlert
        isOpen={confirmQuitOpen}
        onDidDismiss={() => setConfirmQuitOpen(false)}
        header={t('quitQuizTitle') ?? ''}
        message={t('quitQuizMessage') ?? ''}
        buttons={[
          { text: t('quitQuizCancel') ?? '', role: 'cancel' },
          { text: t('quitQuizConfirm') ?? '', role: 'destructive', handler: quit },
        ]}
      />
      <ReportQuestion
        isOpen={reportOpen}
        questionId={currentQuestion?.id}
        locale={language}
        onClose={() => setReportOpen(false)}
        onSent={() => {
          if (!currentQuestion) return;
          rememberReportedQuestion(currentQuestion.id);
          setReportedIds((ids) => (ids.includes(currentQuestion.id) ? ids : [...ids, currentQuestion.id]));
        }}
      />
    </IonPage>
  );
};

export default Quiz;
