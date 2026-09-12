import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NonPreemptivePage from "./pages/NonPreemptivePage.tsx";
import RoundRobinPage from "./pages/RoundRobinPage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NonPreemptivePage />} />
        <Route path="/round-robin" element={<RoundRobinPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
