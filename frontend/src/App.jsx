import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import InputArchitecturePage from './pages/InputArchitecturePage';
import AnalyzeResultsPage from './pages/AnalyzeResultsPage';
import ReportPage from './pages/ReportPage';

export default function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/input" element={<InputArchitecturePage />} />
                <Route path="/analyze" element={<AnalyzeResultsPage />} />
                <Route path="/report/:id" element={<ReportPage />} />
            </Routes>
        </Router>
    );
}
