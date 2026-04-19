import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'
import Signup from './pages/Signup'
import Checkout from './pages/Checkout'
import Success from './pages/Success'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/chat/signup" element={<Signup />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/success" element={<Checkout />} />
      </Routes>
    </BrowserRouter>
  )
}
