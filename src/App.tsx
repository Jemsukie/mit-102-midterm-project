import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NonPreemptivePage from "./pages/NonPreemptivePage.tsx";
import RoundRobinPage from "./pages/RoundRobinPage.tsx";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export default function App() {
  return (
    <BrowserRouter basename={basename === "/" ? undefined : basename}>
      <Routes>
        <Route path="/" element={<NonPreemptivePage />} />
        <Route path="/round-robin" element={<RoundRobinPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
