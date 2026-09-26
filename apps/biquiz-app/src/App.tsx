import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Route, useLocation } from "react-router-dom";
import { track } from "./utils/analytics";
import About from "./pages/About";
import Answers from "./pages/Answers";
import GameDetails from "./pages/GameDetails";
import Games from "./pages/Games";
import Home from "./pages/home/Home";
import Quiz from "./pages/quiz/Quiz";
import Progress from "./pages/Progress";
import Result from "./pages/Result";
import Settings from "./pages/Settings";
import { homeSharp, informationCircle, settingsSharp } from "ionicons/icons";
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "./theme/variables.css";

setupIonicReact();

const PageViewTracker: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    track("app_open");
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <PageViewTracker />
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<Home />} />
            <Route path="/page/quiz/category/:category_id" element={<Quiz />} />
            <Route path="/page/result/:category_id" element={<Result />} />
            <Route path="/page/answers" element={<Answers />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/games" element={<Games />} />
            <Route path="/page/game/:id" element={<GameDetails />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/">
              <IonIcon icon={homeSharp} />
              <IonLabel>{t("home")}</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settingsSharp} />
              <IonLabel>{t("settings")}</IonLabel>
            </IonTabButton>
            <IonTabButton tab="about" href="/about">
              <IonIcon icon={informationCircle} />
              <IonLabel>{t("about")}</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
