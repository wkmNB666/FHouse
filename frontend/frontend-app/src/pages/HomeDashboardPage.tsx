import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, DatePicker, Row, Space, Typography, message } from 'antd'
import {
  CloudOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  DashboardOutlined,
  HomeOutlined,
  UserAddOutlined,
  FileTextOutlined,
  DollarOutlined,
  LineChartOutlined,
  BarChartOutlined,
  SearchOutlined,
  SunOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { fetchStatsSeriesByHour, fetchStatsSummary, fetchWeather } from '../services/dashboardService'

const MOCK_LIVE: LiveItem = {
  province: '江苏省',
  city: '苏州',
  adcode: '320500',
  weather: '晴',
  temperature: '22',
  winddirection: '东南',
  windpower: '3',
  humidity: '65',
  reporttime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
}

const MOCK_CASTS: CastItem[] = [
  { date: dayjs().format('YYYY-MM-DD'), week: '今天', dayweather: '晴', nightweather: '多云', daytemp: '22', nighttemp: '16', daywind: '东南', nightwind: '东南', daypower: '3', nightpower: '2' },
  ...Array.from({ length: 4 }, (_, i) => ({
    date: dayjs().add(i + 1, 'day').format('YYYY-MM-DD'),
    week: ['明天', '后天', '大后天', '第四天'][i],
    dayweather: '晴',
    nightweather: '多云',
    daytemp: '24',
    nighttemp: '17',
    daywind: '东',
    nightwind: '东',
    daypower: '2',
    nightpower: '1',
  } as CastItem)),
]

type AmapLive = {
  status: string
  lives?: LiveItem[]
}

type AmapForecast = {
  status: string
  forecasts?: ForecastItem[]
}

type LiveItem = {
  province: string
  city: string
  adcode: string
  weather: string
  temperature: string
  winddirection: string
  windpower: string
  humidity: string
  reporttime: string
}

type CastItem = {
  date: string
  week: string
  dayweather: string
  nightweather: string
  daytemp: string
  nighttemp: string
  daywind: string
  nightwind: string
  daypower: string
  nightpower: string
}

type ForecastItem = {
  city: string
  adcode: string
  province: string
  reporttime: string
  casts: CastItem[]
}

export function HomeDashboardPage() {
  const [loading, setLoading] = useState(false)
  const [weatherLive, setWeatherLive] = useState<LiveItem | null>(null)
  const [weatherCasts, setWeatherCasts] = useState<CastItem[] | null>(null)
  const [summary, setSummary] = useState<{ date: string; houseCount: number; newUserCount: number; signedCount: number; revenue: number } | null>(null)
  const [summaryLabel, setSummaryLabel] = useState<'昨日' | '今日'>('昨日')
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(6, 'day'), dayjs()])
  const [chartDate, setChartDate] = useState(dayjs())
  const [seriesByHour, setSeriesByHour] = useState<{ hours: string[]; houseCount: number[]; newUserCount: number[] } | null>(null)

  const loadWeather = async () => {
    try {
      const w = await fetchWeather()
      const live = JSON.parse(w.live) as AmapLive
      const forecast = JSON.parse(w.forecast) as AmapForecast
      setWeatherLive(live.lives?.[0] ?? null)
      setWeatherCasts(forecast.forecasts?.[0]?.casts ?? null)
    } catch {
      setWeatherLive(MOCK_LIVE)
      setWeatherCasts(MOCK_CASTS)
    }
  }

  const loadAll = async (chartDateOverride?: string) => {
    try {
      setLoading(true)
      await loadWeather()

      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
      let s = await fetchStatsSummary(yesterday)

      const isEmpty = (x: typeof s) => (x?.houseCount ?? 0) === 0 && (x?.newUserCount ?? 0) === 0 && (x?.signedCount ?? 0) === 0 && (x?.revenue ?? 0) === 0

      if (isEmpty(s)) {
        const today = dayjs().format('YYYY-MM-DD')
        s = await fetchStatsSummary(today)
        setSummaryLabel('今日')
      } else {
        setSummaryLabel('昨日')
      }

      setSummary(s)

      const dateForHour = chartDateOverride ?? chartDate.format('YYYY-MM-DD')
      if (chartDateOverride) setChartDate(dayjs(chartDateOverride))
      const hourRes = await fetchStatsSeriesByHour(dateForHour)
      setSeriesByHour(hourRes ? { hours: hourRes.hours, houseCount: hourRes.houseCount, newUserCount: hourRes.newUserCount } : null)
    } catch (err: any) {
      message.error(err?.message || '加载首页数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onRangeChange = (v: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (v?.[0] && v?.[1]) setRange([v[0], v[1]])
  }

  const onQuery = () => {
    loadAll(range[1].format('YYYY-MM-DD'))
  }

  const lineOption = useMemo(() => {
    if (!seriesByHour) return {}
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: seriesByHour.hours.map((h) => `${h}:00`) },
      yAxis: { type: 'value' },
      series: [
        {
          name: '每小时新增用户数',
          type: 'line',
          smooth: true,
          data: seriesByHour.newUserCount,
        },
      ],
    }
  }, [seriesByHour])

  const barOption = useMemo(() => {
    if (!seriesByHour) return {}
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: seriesByHour.hours.map((h) => `${h}:00`) },
      yAxis: { type: 'value' },
      series: [
        {
          name: '每小时房源数量',
          type: 'bar',
          data: seriesByHour.houseCount,
        },
      ],
    }
  }, [seriesByHour])

  const cardStyle = {
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  }
  const cardHover = (e: React.MouseEvent<HTMLDivElement>, enter: boolean) => {
    const el = e.currentTarget
    el.style.boxShadow = enter ? '0 4px 16px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.06)'
    el.style.transform = enter ? 'translateY(-2px)' : 'none'
  }

  const getWeatherIcon = (weather: string) => {
    const w = (weather || '').trim()
    if (/晴/.test(w)) return { Icon: SunOutlined, color: '#faad14' }
    if (/雨|雪/.test(w)) return { Icon: CloudOutlined, color: '#1890ff' }
    if (/云|阴|多云/.test(w)) return { Icon: CloudOutlined, color: '#8c8c8c' }
    return { Icon: CloudOutlined, color: '#bfbfbf' }
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card
        loading={loading}
        bodyStyle={{ padding: 20 }}
        style={{ ...cardStyle }}
        onMouseEnter={(e) => cardHover(e, true)}
        onMouseLeave={(e) => cardHover(e, false)}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space align="center" style={{ marginBottom: 4 }}>
              <DashboardOutlined style={{ fontSize: 18, color: '#1890ff' }} />
              <Typography.Title level={5} style={{ margin: 0 }}>
                天气看板
              </Typography.Title>
            </Space>
            <Typography.Text type="secondary">
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              {weatherLive?.province || ''} {weatherLive?.city || ''}（{weatherLive?.reporttime || '-'}）
            </Typography.Text>
            <div style={{ marginTop: 12 }}>
              <Space size={20} wrap>
                <Typography.Text><CloudOutlined style={{ marginRight: 4 }} />天气：{weatherLive?.weather ?? '-'}</Typography.Text>
                <Typography.Text><ThunderboltOutlined style={{ marginRight: 4 }} />温度：{weatherLive?.temperature ?? '-'}℃</Typography.Text>
                <Typography.Text><CompassOutlined style={{ marginRight: 4 }} />风向：{weatherLive?.winddirection ?? '-'} {weatherLive?.windpower ?? ''}级</Typography.Text>
                <Typography.Text>湿度：{weatherLive?.humidity ?? '-'}%</Typography.Text>
              </Space>
            </div>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {(weatherCasts || []).slice(0, 5).map((c: CastItem) => {
            const dayIcon = getWeatherIcon(c.dayweather)
            const nightIcon = getWeatherIcon(c.nightweather)
            return (
              <Col key={c.date} xs={24} sm={12} md={8} lg={4}>
                <Card
                  size="small"
                  styles={{ body: { padding: 12 } }}
                  style={{ borderRadius: 10, transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Typography.Text strong>{c.date}</Typography.Text>
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <div>白天：{c.dayweather} {c.daytemp}℃</div>
                        <div>夜间：{c.nightweather} {c.nighttemp}℃</div>
                      </div>
                    </div>
                    <Space direction="vertical" size={0} align="end">
                      <dayIcon.Icon style={{ color: dayIcon.color, fontSize: 20 }} />
                      <nightIcon.Icon style={{ color: nightIcon.color, fontSize: 16 }} />
                    </Space>
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      </Card>

      {/* 统计查询：放在上架房源等四指标卡上方 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Space size={8}>
          <DatePicker.RangePicker size="small" value={range} onChange={onRangeChange} />
          <Button type="primary" size="small" icon={<SearchOutlined />} onClick={onQuery}>
            按时间查询统计
          </Button>
        </Space>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card
            loading={loading}
            size="small"
            bodyStyle={{ padding: '12px 16px' }}
            style={{ ...cardStyle }}
            onMouseEnter={(e) => cardHover(e, true)}
            onMouseLeave={(e) => cardHover(e, false)}
          >
            <Space align="center" style={{ marginBottom: 2 }}>
              <HomeOutlined style={{ color: '#1890ff', fontSize: 16 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>上架房源（{summaryLabel}）</Typography.Text>
            </Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {summary?.houseCount ?? '-'}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            loading={loading}
            size="small"
            bodyStyle={{ padding: '12px 16px' }}
            style={{ ...cardStyle }}
            onMouseEnter={(e) => cardHover(e, true)}
            onMouseLeave={(e) => cardHover(e, false)}
          >
            <Space align="center" style={{ marginBottom: 2 }}>
              <UserAddOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>新增用户（{summaryLabel}）</Typography.Text>
            </Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {summary?.newUserCount ?? '-'}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            loading={loading}
            size="small"
            bodyStyle={{ padding: '12px 16px' }}
            style={{ ...cardStyle }}
            onMouseEnter={(e) => cardHover(e, true)}
            onMouseLeave={(e) => cardHover(e, false)}
          >
            <Space align="center" style={{ marginBottom: 2 }}>
              <FileTextOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>签订数量（{summaryLabel}）</Typography.Text>
            </Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {summary?.signedCount ?? '-'}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            loading={loading}
            size="small"
            bodyStyle={{ padding: '12px 16px' }}
            style={{ ...cardStyle }}
            onMouseEnter={(e) => cardHover(e, true)}
            onMouseLeave={(e) => cardHover(e, false)}
          >
            <Space align="center" style={{ marginBottom: 2 }}>
              <DollarOutlined style={{ color: '#722ed1', fontSize: 16 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>收益金额（{summaryLabel}）</Typography.Text>
            </Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              ¥ {summary?.revenue ?? '-'}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <LineChartOutlined style={{ color: '#1890ff' }} />
                用户活跃度（按小时）
              </Space>
            }
            loading={loading}
            style={{ ...cardStyle }}
            onMouseEnter={(e) => cardHover(e, true)}
            onMouseLeave={(e) => cardHover(e, false)}
          >
            <ReactECharts option={lineOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: '#52c41a' }} />
                房屋数量（按小时）
              </Space>
            }
            loading={loading}
            style={{ ...cardStyle }}
            onMouseEnter={(e) => cardHover(e, true)}
            onMouseLeave={(e) => cardHover(e, false)}
          >
            <ReactECharts option={barOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

