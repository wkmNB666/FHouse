import { Layout, Menu, Flex, Typography, Dropdown, Modal, Form, Input, message } from 'antd'
import {
  HomeOutlined,
  ApartmentOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout

export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const [now, setNow] = useState(dayjs())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const selectedKey =
    location.pathname.startsWith('/houses')
      ? 'houses'
      : location.pathname.startsWith('/users')
        ? 'users'
        : 'home'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleSettingsOk = () => {
    form.validateFields().then((values) => {
      updateUser({ displayName: values.displayName || undefined })
      message.success('保存成功')
      setSettingsOpen(false)
      form.resetFields()
    })
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人用户设置',
      onClick: () => {
        setSettingsOpen(true)
        form.setFieldsValue({ displayName: user?.displayName ?? '', userName: user?.userName ?? '' })
      },
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出',
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: '#001529' }}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          快找房
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: 'home',
              icon: <HomeOutlined />,
              label: <Link to="/houses">首页</Link>,
            },
            {
              key: 'houses',
              icon: <ApartmentOutlined />,
              label: <Link to="/houses">房源模块</Link>,
            },
            {
              key: 'users',
              icon: <UserOutlined />,
              label: <Link to="/users">用户模块</Link>,
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            height: 64,
            lineHeight: '64px',
            background: '#fff',
            paddingInline: 24,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Flex justify="space-between" align="center" style={{ width: '100%' }} gap={16}>
            <Typography.Text style={{ color: '#333' }}>⛅ 晴</Typography.Text>
            <Typography.Text style={{ color: '#333' }}>
              🕒 {now.format('YYYY-MM-DD HH:mm')}
            </Typography.Text>
            <Dropdown menu={{ items: userMenuItems }} trigger={['contextMenu', 'click']}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#333',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 6,
                  userSelect: 'none',
                }}
                onContextMenu={(e) => e.preventDefault()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                👤 欢迎你, {user?.displayName || user?.userName || '管理员'}
              </span>
            </Dropdown>
          </Flex>
        </Header>
        <Content style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              minHeight: 360,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
      <Modal
        title="个人用户设置"
        open={settingsOpen}
        onOk={handleSettingsOk}
        onCancel={() => { setSettingsOpen(false); form.resetFields() }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="账号" name="userName">
            <Input disabled placeholder="登录账号" />
          </Form.Item>
          <Form.Item label="显示名称" name="displayName">
            <Input placeholder="用于页面展示的昵称，如：王凯明" allowClear />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

