import { AnimatePresence } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import PageTransition from './components/PageTransition/PageTransition.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import Calendar from './pages/Calendar/Calendar.jsx';
import Contact from './pages/Contact/Contact.jsx';
import Dashboard from './pages/Dasboard/Dashboard.jsx';
import EntriesList from './pages/EntriesList/EntriesList.jsx';
import EntryDetail from './pages/EntryDetail/EntryDetail.jsx';
import EntryEditor from './pages/EntryEditor/EntryEditor.jsx';
import Highlights from './pages/Highlights/Highlights.jsx';
import Landing from './pages/Landing/Landing.jsx';
import Learning from './pages/Learning/Learning.jsx';
import LifeChapters from './pages/LifeChapters/LifeChapters.jsx';
import Login from './pages/Login/Login.jsx';
import Logout from './pages/Logout/Logout.jsx';
import Privacy from './pages/Privacy/Privacy.jsx';
import Search from './pages/Search/Search.jsx';
import Signup from './pages/Signup/Signup.jsx';
import Terms from './pages/Terms/Terms.jsx';
import TimeCapsule from './pages/TimeCapsule/TimeCapsule.jsx';
import TimeCapsuleList from './pages/TimeCapsuleList/TimeCapsuleList.jsx';
import Unauthorized from './pages/Unauthorized/Unauthorized.jsx';
import Welcome from './pages/Welcome/Welcome.jsx';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition variant="fade"><Landing /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/logout" element={<PageTransition><Logout /></PageTransition>} />
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
        <Route
          path="/learning"
          element={
            <ProtectedRoute>
              <PageTransition><Learning /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <PageTransition><Calendar /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route
          path="/dashboard/time-capsule/new"
          element={
            <ProtectedRoute>
              <PageTransition><TimeCapsule /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/time-capsules"
          element={
            <ProtectedRoute>
              <PageTransition><TimeCapsuleList /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/time-capsule/:id"
          element={
            <ProtectedRoute>
              <PageTransition><TimeCapsuleList /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/life-chapters"
          element={
            <ProtectedRoute>
              <PageTransition><LifeChapters /></PageTransition>
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
