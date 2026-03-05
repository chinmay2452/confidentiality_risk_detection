import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AnalyzePage from './pages/AnalyzePage';
import ReportPage from './pages/ReportPage';

export default function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analyze" element={<AnalyzePage />} />
                <Route path="/report/:id" element={<ReportPage />} />
            </Routes>
        </Router>
    );
}
