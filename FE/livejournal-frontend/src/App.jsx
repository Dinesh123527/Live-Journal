import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing/Landing.jsx';
import Login from './pages/Login/Login.jsx';
import Signup from './pages/Signup/Signup.jsx';
import Welcome from './pages/Welcome/Welcome.jsx';
import Dashboard from './pages/Dasboard/Dashboard.jsx';
import EntryEditor from './pages/EntryEditor/EntryEditor.jsx';
import EntriesList from './pages/EntriesList/EntriesList.jsx';
import EntryDetail from './pages/EntryDetail/EntryDetail.jsx';
import Search from './pages/Search/Search.jsx';
import Highlights from './pages/Highlights/Highlights.jsx';
import Unauthorized from './pages/Unauthorized/Unauthorized.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import PageTransition from './components/PageTransition/PageTransition.jsx';
import './App.css';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition variant="fade"><Landing /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/unauthorized" element={<PageTransition><Unauthorized /></PageTransition>} />
        <Route
          path="/welcome"
          element={
            <ProtectedRoute>
              <PageTransition><Welcome /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageTransition><Dashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/entries"
          element={
            <ProtectedRoute>
              <PageTransition><EntriesList /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/entry/:id"
          element={
            <ProtectedRoute>
              <PageTransition><EntryDetail /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/new-entry"
          element={
            <ProtectedRoute>
              <PageTransition><EntryEditor /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/edit-entry/:id"
          element={
            <ProtectedRoute>
              <PageTransition><EntryEditor /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/edit-draft/:draftId"
          element={
            <ProtectedRoute>
              <PageTransition><EntryEditor /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/search"
          element={
            <ProtectedRoute>
              <PageTransition><Search /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/highlights"
          element={
            <ProtectedRoute>
              <PageTransition><Highlights /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
