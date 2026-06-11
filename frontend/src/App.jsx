import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'
import Signup from './pages/Signup'
import Checkout from './pages/Checkout'
import Success from './pages/Success'
import Admin from './pages/Admin'
import Transcription from "./pages/Transcription";
import Copilot from "./pages/Copilot";
import MindAnalysis from "./pages/MindAnalysis";
import WhatsAppBot from "./pages/WhatsAppBot";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/chat/signup" element={<Signup />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/success" element={<Success />} />
        <Route path="/admin" element={<Admin />} />
              <Route path="/transcricao" element={<Transcription />} />
        <Route path="/copilot" element={<Copilot />} />
        <Route path="/mind-analysis" element={<MindAnalysis />} />
              <Route path="/whatsapp-bot" element={<WhatsAppBot />} />
      </Routes>
    </BrowserRouter>
  )
}
