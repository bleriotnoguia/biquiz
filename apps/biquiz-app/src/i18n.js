import i18next from "i18next";
import { initReactI18next } from "react-i18next";

const savedLanguage = (() => {
  try {
    return localStorage.getItem('biquiz-settings')
      ? JSON.parse(localStorage.getItem('biquiz-settings')).state?.language
      : null;
  } catch {
    return null;
  }
})();

i18next.use(initReactI18next).init({
  fallbackLng: savedLanguage ?? "fr",
  resources: {
    en: {
      translation: {
        home: "Home",
        settings: "Settings",
        french: "French",
        english: "English",
        langOption: "Change language",
        darkMode: "Dark Mode",
        displaySourceInQuiz: "Display source in quiz",
        appSubTitle: "Bible quiz",
        about: "About",
        share: "Share",
        shareApp: "Share app",
        categoryDescription: "Test your knowledge of the scriptures",
        displaySource: "Display source",
        result: "Result",
        resultTitle: "Quiz completed successfully",
        resultDescription1: "You made",
        resultDescription2: "questions and from that",
        resultDescription3: "answer(s) are correct in the quiz",
        replay: "Replay",
        displayAnswers: "Display answers",
        answers: "Answers",
        goodAnswer: "Good answer !",
        theGoodAnswerIs: "The good answer is : ",
        continue: "Continue",
        contactDev: "Contact the developer",
        emailDev: "Email Developer",
        rate: "Rate",
        rateApp: "Rate the app",
        versionApp: "Application version",
        privacyRule: "Privacy rule",
        clickForMoreInfo: "Click for more informations",
        loading: "Loading...",
        yes: "Yes",
        no: "No",
        connectionError: "It looks like you have a connection issue. Make sure you have it enabled, then click the refresh button below",
      },
    },
    fr: {
      translation: {
        home: "Accueil",
        settings: "Paramètres",
        french: "Français",
        english: "Anglais",
        langOption: "Changer la langue",
        darkMode: "Thème sombre",
        displaySourceInQuiz: "Montrer la source dans le quiz",
        appSubTitle: "Quiz biblique",
        about: "À propos",
        share: "Partager",
        shareApp: "Partager l'application",
        categoryDescription: "Testez votre connaissance des écritures",
        displaySource: "Voir la source",
        result: "Résultat",
        resultTitle: "Quiz terminé avec succès",
        resultDescription1: "Vous avez fait",
        resultDescription2: "questions et à partir de cela",
        resultDescription3: "réponse(s) sont correctes dans le quiz",
        replay: "Rejouer",
        displayAnswers: "Afficher les réponses",
        answers: "Réponses",
        goodAnswer: "Bonne réponse !",
        theGoodAnswerIs: "La bonne réponse est : ",
        continue: "Continuer",
        contactDev: "Contacter le développeur",
        emailDev: "Envoyer un email au développeur",
        rate: "Noter",
        rateApp: "Noter l'application",
        versionApp: "Version de l'application",
        privacyRule: "Règle de confidentialité",
        clickForMoreInfo: "Appuyer pour plus d'informations",
        loading: "Chargement...",
        yes: "Oui",
        no: "Non",
        connectionError: "Il semble que vous ayez un problème de connexion. Vérifiez que vous êtes connecté, puis cliquez sur le bouton ci-dessous",
      },
    },
  },
});
