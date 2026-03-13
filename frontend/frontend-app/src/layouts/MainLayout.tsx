import { Layout, Menu, Flex, Typography, Dropdown, Modal, Form, Input, message, Divider } from 'antd'
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
import { changePassword, updateProfile } from '../services/authService'

const { Header, Sider, Content } = Layout

export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const [now, setNow] = useState(dayjs())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(timer)
  }, [])

  const selectedKey =
    location.pathname.startsWith('/houses')
      ? 'houses'
      : location.pathname.startsWith('/users')
        ? 'users'
        : location.pathname.startsWith('/roles')
          ? 'roles'
          : location.pathname.startsWith('/contracts')
            ? 'contracts'
          : 'home'

  const permissionSet = new Set((user?.permissions || '').split(',').map((s) => s.trim()).filter(Boolean))
  const canSee = (p: string) => permissionSet.size === 0 || permissionSet.has(p)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleSettingsOk = () => {
    form.validateFields().then((values) => {
      Promise.resolve()
        .then(async () => {
          await updateProfile({ realName: values.realName ?? null, contact: values.contact ?? null })
          updateUser({ realName: values.realName || undefined, contact: values.contact || undefined })

          if (values.oldPassword && values.newPassword) {
            await changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword })
          }
        })
        .then(() => {
          message.success('保存成功')
          setSettingsOpen(false)
          form.resetFields()
        })
        .catch((err: any) => {
          message.error(err?.message || '保存失败')
        })
    })
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人用户设置',
      onClick: () => {
        setSettingsOpen(true)
        form.setFieldsValue({
          userName: user?.userName ?? '',
          realName: user?.realName ?? '',
          contact: user?.contact ?? '',
          role: user?.role ?? '',
          oldPassword: '',
          newPassword: '',
        })
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
            gap: 8,
          }}
        >
          <HomeOutlined style={{ fontSize: 22 }} />
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
              label: <Link to="/home">首页</Link>,
            },
            canSee('HouseModule') ? {
              key: 'houses',
              icon: <ApartmentOutlined />,
              label: <Link to="/houses">房源模块</Link>,
            } : null,
            canSee('UserModule') ? {
              key: 'users',
              icon: <UserOutlined />,
              label: <Link to="/users">用户模块</Link>,
            } : null,
            canSee('RoleModule') ? {
              key: 'roles',
              icon: <UserOutlined />,
              label: <Link to="/roles">角色模块</Link>,
            } : null,
            canSee('ContractModule') ? {
              key: 'contracts',
              icon: <UserOutlined />,
              label: <Link to="/contracts">签约模块</Link>,
            } : null,
          ].filter(Boolean) as any}
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
            <Typography.Text style={{ color: '#333', fontVariantNumeric: 'tabular-nums' }}>
              {now.format('HH:mm:ss')}
            </Typography.Text>
            <Typography.Text style={{ color: '#333' }}>
              {['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.day()]}
            </Typography.Text>
            <Typography.Text style={{ color: '#333' }}>
              {now.format('YYYY年')}
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
                👤 欢迎你, {user?.realName || user?.userName || '管理员'}
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
          <Form.Item label="姓名" name="realName">
            <Input placeholder="如：王凯明" allowClear />
          </Form.Item>
          <Form.Item label="联系方式" name="contact">
            <Input placeholder="如：138xxxxxx" allowClear />
          </Form.Item>
          <Form.Item label="角色" name="role">
            <Input disabled />
          </Form.Item>

          <Divider style={{ marginBlock: 12 }} />
          <Form.Item label="旧密码" name="oldPassword">
            <Input.Password placeholder="不修改密码可留空" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            dependencies={['oldPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const oldPwd = getFieldValue('oldPassword')
                  if (!oldPwd && !value) return Promise.resolve()
                  if (oldPwd && !value) return Promise.reject(new Error('请输入新密码'))
                  if (!oldPwd && value) return Promise.reject(new Error('请输入旧密码'))
                  if (oldPwd && value && oldPwd === value) return Promise.reject(new Error('新密码不能与旧密码相同'))
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <Input.Password placeholder="不修改密码可留空" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

