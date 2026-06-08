import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPostHog } from "./lib/posthog";
import { registerServiceWorker } from "./lib/registerServiceWorker";

initPostHog();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
