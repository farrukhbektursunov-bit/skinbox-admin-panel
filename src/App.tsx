import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import AppShell from './components/AppShell'
import ConfigMissingPage from './pages/ConfigMissingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AnalitikaPage from './pages/AnalitikaPage'
import MahsulotlarPage from './pages/MahsulotlarPage'
import TurkumlarPage from './pages/TurkumlarPage'
import AksiyalarPage from './pages/AksiyalarPage'
import KuponlarPage from './pages/KuponlarPage'
import PochtaNarxiPage from './pages/PochtaNarxiPage'
import OmborPage from './pages/OmborPage'
import BuyurtmalarPage from './pages/BuyurtmalarPage'
import SotuvlarPage from './pages/SotuvlarPage'
import MijozlarPage from './pages/MijozlarPage'
import XabarnomaPage from './pages/XabarnomaPage'
import SozlamalarPage from './pages/SozlamalarPage'

function AdminRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analitika" element={<AnalitikaPage />} />
        <Route path="/mahsulotlar" element={<MahsulotlarPage />} />
        <Route path="/turkum-wa-bolim" element={<TurkumlarPage />} />
        <Route path="/aksiyalar" element={<AksiyalarPage />} />
        <Route path="/kuponlar" element={<KuponlarPage />} />
        <Route path="/pochta-narxi" element={<PochtaNarxiPage />} />
        <Route path="/ombor" element={<OmborPage />} />
        <Route path="/buyurtmalar" element={<BuyurtmalarPage />} />
        <Route path="/sotuvlar" element={<SotuvlarPage />} />
        <Route path="/mijozlar" element={<MijozlarPage />} />
        <Route path="/xabarnoma" element={<XabarnomaPage />} />
        <Route path="/sozlamalar" element={<SozlamalarPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigMissingPage />
  }

  return <AppWithAuth />
}

function AppWithAuth() {
  const { loading, profileLoading, adminCheckLoading, user, profile, isAdmin } = useAuth()

  if (loading || (user && (profileLoading || adminCheckLoading))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">
        Yuklanmoqda…
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (user && profile && !isAdmin) {
    return <LoginPage />
  }

  if (user && !profile) {
    return <LoginPage />
  }

  return <AdminRoutes />
}
