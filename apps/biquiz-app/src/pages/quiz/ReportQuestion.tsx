import { useState } from "react";
import { IonButton, IonModal, IonTextarea } from "@ionic/react";
import { useTranslation } from "react-i18next";
import { getDeviceId } from "../../utils/analytics";
import { supabase } from "../../utils/supabase";
import "./ReportQuestion.css";

const REASONS = ["wrong_answer", "typo", "bad_reference", "other"] as const;

const REASON_LABEL: Record<(typeof REASONS)[number], string> = {
  wrong_answer: "reportWrongAnswer",
  typo: "reportTypo",
  bad_reference: "reportReference",
  other: "reportOther",
};

type Props = {
  isOpen: boolean
  questionId: number | undefined
  locale: string
  onClose: () => void
  onSent: () => void
}

const ReportQuestion = ({ isOpen, questionId, locale, onClose, onSent }: Props) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<(typeof REASONS)[number] | "">("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (sending) return;
    setReason("");
    setComment("");
    setError("");
    onClose();
  };

  const send = async () => {
    if (!questionId || !reason || sending) return;
    setSending(true);
    setError("");
    const { error: insertError } = await supabase.from("question_reports").insert({
      question_id: questionId,
      reason,
      comment: comment.trim() || null,
      locale,
      device_id: getDeviceId(),
    });
    setSending(false);
    if (insertError) {
      if (insertError.code === "23505") {
        setReason("");
        setComment("");
        onSent();
        onClose();
        return;
      }
      setError(t(insertError.code === "54000" ? "reportLimited" : "reportFailed") ?? "");
      return;
    }
    setReason("");
    setComment("");
    onSent();
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={close} id="report-modal">
      <div className="report-wrapper">
        <h3>{t("reportTitle")}</h3>
        <div className="report-reasons">
          {REASONS.map((item) => (
            <button
              key={item}
              type="button"
              className={item === reason ? "selected" : ""}
              onClick={() => setReason(item)}
            >
              {t(REASON_LABEL[item])}
            </button>
          ))}
        </div>
        <IonTextarea
          placeholder={t("reportComment") ?? ""}
          value={comment}
          maxlength={500}
          rows={3}
          onIonInput={(event) => setComment(event.detail.value ?? "")}
        />
        {error && <p className="report-error">{error}</p>}
        <div className="report-actions">
          <IonButton fill="clear" onClick={close}>
            {t("reportCancel")}
          </IonButton>
          <IonButton disabled={!reason || sending} onClick={send}>
            {t("reportSend")}
          </IonButton>
        </div>
      </div>
    </IonModal>
  );
};

export default ReportQuestion;
