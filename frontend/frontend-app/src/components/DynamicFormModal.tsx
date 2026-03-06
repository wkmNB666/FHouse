import { Modal, Form, Input, InputNumber, Select } from 'antd'
import { useEffect } from 'react'

type Mode = 'house' | 'user'

interface DynamicFormModalProps {
  open: boolean
  mode: Mode
  initialValues?: Record<string, any>
  onOk: (values: Record<string, any>) => void
  onCancel: () => void
}

const genderOptions = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
]

export function DynamicFormModal({
  open,
  mode,
  initialValues,
  onOk,
  onCancel,
}: DynamicFormModalProps) {
  const [form] = Form.useForm()

  const title = mode === 'house'
    ? (initialValues?.communityName ? '编辑房源' : '添加房源')
    : (initialValues?.userName ? '编辑用户' : '添加用户')

  useEffect(() => {
    if (open && initialValues) {
      form.setFieldsValue(initialValues)
    } else if (open && !initialValues) {
      form.resetFields()
    }
  }, [open, initialValues, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onOk(values)
      form.resetFields()
    } catch {
      // 校验失败时交给 AntD 自己展示错误
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal open={open} title={title} onOk={handleOk} onCancel={handleCancel} destroyOnClose>
      <Form form={form} layout="vertical" initialValues={initialValues}>
        {mode === 'house' ? (
          <>
            <Form.Item
              label="小区名称"
              name="communityName"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <Input placeholder="请输入小区名称" />
            </Form.Item>
            <Form.Item
              label="小区价格"
              name="price"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="请输入期望价格" min={0} />
            </Form.Item>
            <Form.Item
              label="房龄"
              name="houseAge"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="请输入房屋年限" min={0} />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item
              label="姓名"
              name="userName"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <Input placeholder="请输入姓名" />
            </Form.Item>
            <Form.Item
              label="性别"
              name="gender"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <Select options={genderOptions} placeholder="请选择性别" />
            </Form.Item>
            <Form.Item
              label="联系方式"
              name="contact"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <Input placeholder="请输入联系方式" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}

