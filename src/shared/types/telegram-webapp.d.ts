interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  viewportHeight?: number;
  viewportStableHeight?: number;
  onEvent?: (eventType: "viewportChanged", callback: () => void) => void;
  offEvent?: (eventType: "viewportChanged", callback: () => void) => void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
