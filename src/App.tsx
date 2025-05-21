import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

// Import components
import PinVerification from './components/PinVerification'
import Invoice from './components/Invoice'
import PaymentConfirmation from './components/PaymentConfirmation'

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<PinVerification />} />
            <Route path="/invoice" element={<Invoice />} />
            <Route path="/confirmation" element={<PaymentConfirmation />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  )
}

export default App
