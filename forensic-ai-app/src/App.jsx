import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import CameraDetection from "./pages/camera-detection";
import FakeDetection from "./pages/fake-detection";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/camera-detection" element={<CameraDetection />} />
        <Route path="/fake-detection" element={<FakeDetection />} />
      </Routes>
    </BrowserRouter>
  );
}