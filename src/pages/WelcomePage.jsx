import { useNavigate } from 'react-router-dom'
import { appPath } from '../data/paths.js'
import { Brand } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'

const promises = [
  { icon: 'book', title: '只做今晚的小步骤', text: '专注当下，少而有效。' },
  { icon: 'shield', title: '不因为晚一点责怪孩子', text: '多些理解，多些拥抱。' },
  { icon: 'moon', title: '做完就让屏幕休息', text: '给孩子一个安静的夜晚。' },
]

export function WelcomePage() {
  const navigate = useNavigate()
  return (
    <main className="welcome-page">
      <div className="welcome-brand"><Brand /></div>
      <section className="welcome-card">
        <div className="welcome-illustration">
          <img src={appPath('assets/mascot-moon.webp')} alt="眠眠抱着月亮枕头" />
        </div>
        <div className="welcome-copy">
          <span className="eyebrow">一个温柔的家庭约定</span>
          <h1>一起把睡前<br />变得轻松一点</h1>
          <div className="promise-list">
            {promises.map((item) => (
              <div className="promise" key={item.title}>
                <span><Icon name={item.icon} /></span>
                <div><strong>{item.title}</strong><small>{item.text}</small></div>
              </div>
            ))}
          </div>
          <button className="button button--primary button--wide" type="button" onClick={() => navigate('/setup')}><Icon name="moon" />和孩子一起开始</button>
          <button className="text-button" type="button" onClick={() => navigate('/setup')}>我先替孩子设置</button>
        </div>
      </section>
    </main>
  )
}
