import {createRoot} from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './hooks/useAuth';

createRoot(document.getElementById('root')!).render(
  <Router>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Router>
);
