import { getAccessibility, getActiveProfile } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { PageTitle, Toggle } from '../ui/Shared.jsx'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import { ThemeScene } from '../ui/ThemeArt.jsx'

const settings = [
  { key: 'reduceMotion', icon: 'sparkle', title: '减少动态', text: '减少动画和过渡效果' },
  { key: 'soundOff', icon: 'volume', title: '关闭声音', text: '关闭操作音效、庆祝声和晚安音乐' },
  { key: 'readTasks', icon: 'book', title: '朗读任务', text: '自动朗读任务名称和完成提示' },
  { key: 'highContrast', icon: 'accessibility', title: '高对比度', text: '增强文字与背景的区分' },
  { key: 'largeText', icon: 'user', title: '大号文字', text: '使用更大的文字显示' },
]

export function AccessibilityPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const accessibility = getAccessibility(state)
  const profile = getActiveProfile(state)
  const update = (key, value) => dispatch({ type: 'UPDATE_ACCESSIBILITY', payload: { [key]: value } })
  return (
    <section>
      <PageTitle title="显示、声音与操作" subtitle="调整界面以更好地支持你和孩子的使用体验。" icon="accessibility" />
      <div className="accessibility-layout">
        <article className="accessibility-card">
          {settings.map((item) => <div className="accessibility-row" key={item.key}><span><Icon name={item.icon} /></span><div><strong>{item.title}</strong><small>{item.text}</small></div><Toggle label={item.title} checked={accessibility[item.key]} onChange={(value) => update(item.key, value)} /></div>)}
          <div className="effective-note">ⓘ 这些设置会立即同步到孩子模式。</div>
        </article>
        <aside className="accessibility-preview"><span className="preview-label">孩子模式预览</span><div className="preview-task"><AssetArt id="story" label="故事书" /><div><strong>读故事</strong><small>大约 10 分钟</small></div><i></i></div><ThemeScene theme={profile.theme} character={profile.character} pose="waiting" label="当前角色和主题预览" className="accessibility-theme-preview" /></aside>
      </div>
    </section>
  )
}
