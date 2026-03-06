import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { MainLayout } from './layouts/MainLayout'
import { HouseListPage } from './pages/HouseListPage'
import { UserListPage } from './pages/UserListPage'

function AuthGate() {
  const { user, isReady } = useAuth()
  if (!isReady) return null
  if (!user) return <LoginPage />
  return <Outlet />
}

function LoginRedirect() {
  const { user, isReady } = useAuth()
  if (!isReady) return null
  if (user) return <Navigate to="/houses" replace />
  return <LoginPage />
}

function App() {
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
          <Routes>
            <Route path="/" element={<AuthGate />}>
              <Route index element={<Navigate to="/houses" replace />} />
              <Route element={<MainLayout />}>
                <Route path="houses" element={<HouseListPage />} />
                <Route path="users" element={<UserListPage />} />
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
