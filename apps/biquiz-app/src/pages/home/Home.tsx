import {
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButton,
  IonAlert,
} from "@ionic/react";
import {
  bookSharp,
  lockClosed,
  shareSocialOutline,
  shareSocialSharp,
  starSharp,
  statsChart,
} from "ionicons/icons";
import styles from "./Home.module.css";
import { useHistory } from "react-router-dom";
import { useState } from "react";
import { CategoryConfig } from "@biquiz/shared";
import { useCategories } from "../../queries/useCategories";
import { useScoresStore } from "../../stores/useScoresStore";
import { useQuizStore } from "../../stores/useQuizStore";
import { getStars, capitalizeFirstLetter } from "../../utils";
import { useTranslation } from "react-i18next";
import CategoriesLoading from "./CategoriesLoading";
import { NetworkError } from "./NetworkError";
import { Share } from "@capacitor/share";
import { track } from "../../utils/analytics";

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [showAlert, setShowAlert] = useState(false);
  const [starsRequired, setStarsRequired] = useState(0);
  const { data: categoriesData, isLoading, isError } = useCategories();
  const scores = useScoresStore((s) => s.data);
  const deleteChoices = useQuizStore((s) => s.deleteChoices);
  const totalStars = scores.length
    ? scores.reduce((acc, curr) => acc + curr.stars, 0)
    : 0;
  const history = useHistory();

  function startQuiz(isLock: boolean, category: CategoryConfig) {
    deleteChoices();
    if (isLock) {
      setStarsRequired((category.level - 1) * 5);
      setShowAlert(true);
    } else {
      track("quiz_start", { category_id: category.id });
      history.push(`/page/quiz/category/${category.id}`);
    }
  }

  const shareApp = async () => {
    await Share.share({
      title: "Biquiz",
      text: "J'ai utilisé cette application et je pense que toi aussi tu l'apprécieras",
      url: "https://biquiz.bleriotnoguia.com",
      dialogTitle: "Partager Biquiz",
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>
            <b>Biquiz</b>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton>
              <b style={{ marginRight: "4px", fontSize: "1.1em" }}>
                {Math.round(totalStars)}
              </b>
              <IonIcon icon={starSharp} />
            </IonButton>
            <IonButton onClick={() => shareApp()}>
              <IonIcon
                slot="icon-only"
                ios={shareSocialOutline}
                md={shareSocialSharp}
              />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {isLoading ? (
          <CategoriesLoading />
        ) : isError ? (
          <NetworkError />
        ) : (
          <div className={styles.categoriesGrid}>
            {[...(categoriesData ?? [])]
              .sort((a, b) => a.level - b.level)
              .map((category, idx) => {
                const isLock = totalStars < (category.level - 1) * 5;
                const category_score = scores.length
                  ? scores.find(
                      (score) => parseInt(score.category_id) === category?.id,
                    )
                  : undefined;

                return (
                  <div
                    className={`${styles.cardCategory} ${isLock ? styles.cardLocked : ""}`}
                    key={idx}
                    onClick={() => startQuiz(isLock, category)}
                  >
                    <IonIcon
                      icon={bookSharp}
                      className={styles.iconCategory}
                    />
                    <div className={styles.linkStyle}>
                      <div>
                        <div className={styles.cardCategoryHeader}>
                          <h1 className={styles.cardCategoryTitle}>
                            {capitalizeFirstLetter(category?.name ?? "")}
                          </h1>
                          {isLock && (
                            <IonIcon
                              className={styles.lockIcon}
                              icon={lockClosed}
                            />
                          )}
                        </div>
                        <p className={styles.iconCategoryContent}>
                          {t("categoryDescription")}
                        </p>
                      </div>
                      <div className={styles.iconCategoryFooter}>
                        <div className={styles.starsWrapper}>
                          {getStars(category_score?.stars ?? 0)}
                        </div>
                        <span className={styles.levelBadge}>
                          {category.level} <IonIcon icon={statsChart} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </IonContent>

      <IonAlert
        isOpen={showAlert}
        onDidDismiss={() => setShowAlert(false)}
        header={`${starsRequired} ⭐ requis`}
        message={`Il vous faut ${starsRequired} étoiles pour débloquer ce niveau !`}
        buttons={["OK"]}
      />
    </IonPage>
  );
};

export default Home;
