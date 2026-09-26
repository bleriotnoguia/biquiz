import { CategoryConfig, Choice, Question, QuestionOption, Score } from "@biquiz/shared";
import { starHalfSharp, starOutline, starSharp } from "ionicons/icons";
import { IonIcon } from "@ionic/react";

export const checkIsCorrect = (item: Choice, questions: Question[]) => {
  let question = questions.find((q) => q.id === item.question_id);
  let choice = question?.options.find((c) => c.id === item.choice_id);
  return choice?.is_correct;
};

export const roundToHalf = (value: number) => Math.round(value * 2) / 2;

// Stars are stored rounded like they are displayed, so the unlock threshold matches what the player sees.
export const computeStars = (correctCount: number, total: number) =>
  total > 0 ? roundToHalf((correctCount * 5) / total) : 0;

export const STARS_PER_LEVEL = 4;

export const starsRequired = (level: number) => (level - 1) * STARS_PER_LEVEL;

export const sumStars = (scores: Score[]) =>
  scores.reduce((acc, curr) => acc + roundToHalf(curr.stars), 0);

export const formatStars = (value: number, lang: string) => value.toLocaleString(lang);

export const sortByLevel = (categories: CategoryConfig[]) =>
  [...categories].sort((a, b) => a.level - b.level);

export const getStars = (rating: number) => {
  rating = roundToHalf(rating);
  let output = [];
  let count = 0;

  // Append all the filled whole stars
  for (var i = rating; i >= 1; i--)
    output.push(<IonIcon icon={starSharp} key={++count} />);

  // If there is a half a star, append it
  if (i === 0.5) output.push(<IonIcon icon={starHalfSharp} key={++count} />);

  // Fill the empty stars
  for (let i = 5 - rating; i >= 1; i--)
    output.push(<IonIcon icon={starOutline} key={++count} />);

  return output;
};

export const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const TRUE_LABELS = ["vrai", "true"];

// True/false answers keep a fixed "Vrai" then "Faux" order; other questions are shuffled.
export const arrangeOptions = (question: Question): QuestionOption[] => {
  if (question.type !== "true_false") return shuffle(question.options);
  const isTrue = (o: QuestionOption) => TRUE_LABELS.includes(o.name.trim().toLowerCase());
  return [...question.options].sort((a, b) => Number(isTrue(b)) - Number(isTrue(a)));
};

export const capitalizeFirstLetter = (text: string) => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};
