import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { MainLayout } from './layouts/MainLayout'
import { HouseListPage } from './pages/HouseListPage'
import { UserListPage } from './pages/UserListPage'
import { RoleListPage } from './pages/RoleListPage'
import { HomeDashboardPage } from './pages/HomeDashboardPage'
import { ContractListPage } from './pages/ContractListPage'
import { useEffect, useState } from 'react'
import { QUICKHOUSE_LOADING_EVENT } from './services/http'

function AuthGate() {
  const { user, isReady } = useAuth()
  if (!isReady) return null
  if (!user) return <LoginPage />
  return <Outlet />
}

function LoginRedirect() {
  const { user, isReady } = useAuth()
  if (!isReady) return null
  if (user) return <Navigate to="/home" replace />
  return <LoginPage />
}

function App() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      setLoading(!!e?.detail?.loading)
    }
    window.addEventListener(QUICKHOUSE_LOADING_EVENT, handler)
    return () => window.removeEventListener(QUICKHOUSE_LOADING_EVENT, handler)
  }, [])

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
        components: {
          Table: {
            headerBg: '#fafafa',
            headerColor: '#333333',
          },
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <Spin spinning={loading} fullscreen />
          <Routes>
            <Route path="/" element={<AuthGate />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route element={<MainLayout />}>
                <Route path="home" element={<HomeDashboardPage />} />
                <Route path="houses" element={<HouseListPage />} />
                <Route path="users" element={<UserListPage />} />
                <Route path="roles" element={<RoleListPage />} />
                <Route path="contracts" element={<ContractListPage />} />
              </Route>
            </Route>
            <Route path="/login" element={<LoginRedirect />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
