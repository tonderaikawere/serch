import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { getFirebaseAnalytics } from "@/lib/firebase";

void getFirebaseAnalytics().catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
