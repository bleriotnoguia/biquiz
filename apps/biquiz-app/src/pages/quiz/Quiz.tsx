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
import { arrowBackSharp, checkmarkCircle, closeCircle, flagOutline, timerOutline } from "ionicons/icons";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { QuestionOption } from "@biquiz/shared";
import { useQuestions } from "../../queries/useQuestions";
import { useQuizStore } from "../../stores/useQuizStore";
import { useScoresStore } from "../../stores/useScoresStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import ScriptureReference from "../../components/ScriptureReference";
import { arrangeOptions, checkIsCorrect, computeStars, shuffle, sumStars } from "../../utils";
import { track } from "../../utils/analytics";
import { answerFeedback } from "../../utils/feedback";
import { rememberReportedQuestion, reportedQuestionIds } from "../../utils/reports";
import ListLoading from "../../components/ListLoading";
import FeedBack from "./FeedBack";
import ReportQuestion from "./ReportQuestion";
import "./Quiz.css";

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const TIMEOUT_CHOICE_ID = -1;
const AUTO_NEXT_DELAY_MS = 1200;

type Feedback = { goodAnswer: QuestionOption; success: boolean; timedOut?: boolean };

const Quiz: React.FC = () => {
  const displaySource = useSettingsStore((s) => s.displaySource);
  const language = useSettingsStore((s) => s.language);
  const quizLength = useSettingsStore((s) => s.quizLength);
  const timerEnabled = useSettingsStore((s) => s.timerEnabled);
  const timerSeconds = useSettingsStore((s) => s.timerSeconds);
  const autoNext = useSettingsStore((s) => s.autoNext);
  const { choices, addChoice, setCategoryId, deleteChoices, setLastResult } = useQuizStore();
  const { category_id = '' } = useParams<{ category_id: string }>();
  const [searchParams] = useSearchParams();
  const isReview = searchParams.get('mode') === 'review';
  const saveAttempt = useHistoryStore((s) => s.saveAttempt);
  const setMistakes = useHistoryStore((s) => s.setMistakes);
  // Snapshot at mount: finishing the review rewrites the attempt's mistakes.
  const [reviewIds] = useState(() => useHistoryStore.getState().attempts[category_id]?.mistakeIds ?? []);
  const { data, isLoading } = useQuestions(category_id);
  // Memoized on the query data so a background refetch with identical content keeps the order.
  const questions = useMemo(() => {
    const pool = isReview ? (data ?? []).filter((q) => reviewIds.includes(q.id)) : data ?? [];
    return shuffle(pool)
      .slice(0, isReview ? pool.length : quizLength)
      .map((q) => ({ ...q, options: arrangeOptions(q) }));
  }, [data, quizLength, isReview, reviewIds]);
  const setScore = useScoresStore((s) => s.setScore);
  const scores = useScoresStore((s) => s.data);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [choiceId, setChoiceId] = useState<undefined | number>(undefined);
  const [feedBackIsOpen, setFeedBackIsOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportedIds, setReportedIds] = useState<number[]>(() => reportedQuestionIds());
  const [feedback, setFeedBack] = useState<Feedback>();
  const [confirmQuitOpen, setConfirmQuitOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
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

  function answer(optionId: number) {
    const question = questions[questionIndex];
    if (!question || choiceId !== undefined) return;

    setChoiceId(optionId);
    addChoice({ question_id: question.id, choice_id: optionId });

    const timedOut = optionId === TIMEOUT_CHOICE_ID;
    const success = !timedOut && (question.options.find(opt => opt.id === optionId)?.is_correct ?? false);
    const goodAnswer = question.options.find(opt => opt.is_correct === true)!;

    answerFeedback(success);
    setFeedBack({ goodAnswer, success, timedOut });
    setFeedBackIsOpen(true);
  }

  const timerRunning =
    timerEnabled && isActive && !isLoading && questions.length > 0 && choiceId === undefined && !reportOpen && !confirmQuitOpen;

  useEffect(() => {
    if (!timerRunning) return;
    if (timeLeft <= 0) {
      answer(TIMEOUT_CHOICE_ID);
      return;
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timerRunning, timeLeft]);

  useEffect(() => {
    if (!autoNext || !feedBackIsOpen || !feedback?.success || reportOpen) return;
    const id = setTimeout(nextQuiz, AUTO_NEXT_DELAY_MS);
    return () => clearTimeout(id);
  }, [autoNext, feedBackIsOpen, feedback, reportOpen]);

  function finishQuiz() {
    const choices = useQuizStore.getState().choices;
    const mistakeIds = choices.filter((item) => !checkIsCorrect(item, questions)).map((item) => item.question_id);
    setQuestionIndex(0);
    if (isReview) {
      setMistakes(category_id, mistakeIds);
      router.push(`/page/result/${category_id}?mode=review`, 'forward', 'replace');
      return;
    }
    saveAttempt(category_id, { choices, date: new Date().toISOString(), mistakeIds });
    const correct_count = choices.length - mistakeIds.length;
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
    router.push('/page/result/' + category_id, 'forward', 'replace');
  }

  function nextQuiz() {
    const nextQuizIndex = questionIndex + 1;
    setTimeLeft(timerSeconds);
    if (nextQuizIndex < questions.length) {
      setQuestionIndex(nextQuizIndex);
    } else {
      finishQuiz();
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
          <IonTitle>{isReview ? t('reviewMistakes') : 'Quiz'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {isLoading ? (
          <ListLoading />
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
                {timerEnabled && (
                  <span className={`quiz-timer ${timeLeft <= 5 ? 'urgent' : ''}`} aria-live="polite">
                    <IonIcon icon={timerOutline} /> {timeLeft}s
                  </span>
                )}
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
                  onClick={() => answer(option.id)}
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
