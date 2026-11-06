import { Navigate, Route, Routes } from "react-router-dom";
import Controle from "./pages/Controle";
import Roleta from "./pages/Roleta";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Roleta />} />
      <Route path="/controle" element={<Controle />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
