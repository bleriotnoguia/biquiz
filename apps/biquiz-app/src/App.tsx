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
import { Route as RouterRoute, RouteProps, useLocation } from "react-router-dom";
import { track } from "./utils/analytics";
import About from "./pages/About";
import Answers from "./pages/Answers";
import GameDetails from "./pages/GameDetails";
import Games from "./pages/Games";
import Home from "./pages/home/Home";
import Quiz from "./pages/quiz/Quiz";
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

const Route = RouterRoute as React.ComponentType<RouteProps>;

setupIonicReact();

const PageViewTracker: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  useEffect(() => {
    track("app_open");
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <PageViewTracker />
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/settings" component={Settings} exact />
            <Route path="/about" component={About} exact />
            <Route path="/" component={Home} exact />
            <Route path="/page/quiz/category/:category_id" component={Quiz} />
            <Route path="/page/result/:category_id" component={Result} />
            <Route path="/page/answers" component={Answers} />
            <Route path="/games" component={Games} exact />
            <Route path="/page/game/:id" component={GameDetails} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/">
              <IonIcon icon={homeSharp} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settingsSharp} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
            <IonTabButton tab="about" href="/about">
              <IonIcon icon={informationCircle} />
              <IonLabel>About</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
