import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { AuthProvider } from './context/AuthContext';
import { Home } from './pages/Home';
import { ResearchSession } from './pages/ResearchSession';
import { Workspace } from './pages/Workspace';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/research/:id" element={<ResearchSession />} />
              <Route path="/research/:id/workspace" element={<Workspace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
