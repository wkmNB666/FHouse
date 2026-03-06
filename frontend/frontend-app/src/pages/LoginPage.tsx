import { Card, Form, Input, Button, message } from 'antd'
import { login } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { login: setUser } = useAuth()

  const handleFinish = async (values: { userName: string; password: string }) => {
    try {
      const res = await login(values.userName, values.password)
      message.success('登录成功')
      setUser(res.userName)
      navigate('/houses')
    } catch (err: any) {
      message.error(err?.message || '登录失败')
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(35,30,28,0.5) 0%, rgba(45,38,35,0.35) 100%), url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920) center/cover no-repeat',
      }}
    >
      <Card
        title="快找房 - 登录"
        style={{
          width: 360,
          borderRadius: 16,
          background: 'rgba(255,250,245,0.68)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,248,240,0.4)',
          boxShadow: '0 16px 48px rgba(30,25,20,0.12)',
        }}
        styles={{
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(220,210,200,0.4)',
            color: 'rgba(50,45,42,0.95)',
            fontWeight: 600,
          },
          body: { background: 'transparent' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            label="账号"
            name="userName"
            initialValue="admin"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input placeholder="请输入账号" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            initialValue="123456"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

