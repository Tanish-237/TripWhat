import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Will add more routes in upcoming phases:
            - /chat
            - /itinerary/:id
            - /discover
          */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
