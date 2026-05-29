import { RotateCw, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  loadAiInsights,
  SECTION_AI_PRESETS,
  type AiInsightItem,
  type AiInsights,
  type AiSectionContext,
  type AiSectionKey,
  type AiSettings,
} from './aiClient'

type AiLoadState =
  | { status: 'idle'; key: string }
  | { status: 'loading'; key: string; insights?: AiInsights }
  | { status: 'ready'; key: string; insights: AiInsights }
  | { status: 'error'; key: string; insights?: AiInsights; message: string }

export function AiSectionPanel({
  section,
  context,
  apiBaseUrl,
  aiSettings,
  compact = false,
}: {
  section: AiSectionKey
  context: AiSectionContext
  apiBaseUrl: string
  aiSettings: AiSettings
  compact?: boolean
}) {
  const preset = SECTION_AI_PRESETS[section]
  const contextKey = useMemo(() => stableStringify(context), [context])
  const stateKey = `${section}:${contextKey}`
  const [loadState, setLoadState] = useState<AiLoadState>({ status: 'idle', key: '' })
  const currentState: AiLoadState = loadState.key === stateKey ? loadState : { status: 'idle', key: stateKey }

  async function runAnalysis() {
    const previous = currentState.status === 'ready' ? currentState.insights : undefined
    const controller = new AbortController()
    setLoadState({ status: 'loading', key: stateKey, insights: previous })
    try {
      const insights = await loadAiInsights(apiBaseUrl, aiSettings, controller.signal, { section, context })
      setLoadState({ status: 'ready', key: stateKey, insights })
    } catch (error) {
      setLoadState({
        status: 'error',
        key: stateKey,
        insights: previous,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const insights = 'insights' in currentState ? currentState.insights : undefined
  const providerStatus = insights?.provider?.status ?? (currentState.status === 'loading' ? 'loading' : 'idle')
  const sourceLookup = new Map((insights?.sourceRefs ?? []).map((ref) => [ref.id, ref.label]))
  const itemLimit = compact ? 1 : 3
  const groups = insights
    ? [
      { key: 'warnings', title: '预警', items: insights.warnings?.slice(0, itemLimit) ?? [] },
      { key: 'advice', title: '建议', items: insights.advice?.slice(0, itemLimit) ?? [] },
      { key: 'next', title: '下一步', items: insights.next?.slice(0, itemLimit) ?? [] },
    ].filter((group) => group.items.length)
    : []

  return (
    <section className={`section-ai-panel ${compact ? 'compact' : ''}`}>
      <header>
        <div>
          <span>{preset.source}</span>
          <strong>{preset.title}</strong>
        </div>
        <div className="section-ai-actions">
          <span className={`ai-status ai-status-${providerStatus}`}>{providerLabel(providerStatus, insights)}</span>
          <button className="btn secondary" type="button" disabled={currentState.status === 'loading'} onClick={runAnalysis}>
            {currentState.status === 'ready' ? <RotateCw size={14} /> : <Sparkles size={14} />}
            <span>{currentState.status === 'ready' ? '刷新AI' : currentState.status === 'loading' ? '分析中' : 'AI分析'}</span>
          </button>
        </div>
      </header>
      <p className="section-ai-prompt">{preset.prompt}</p>
      {currentState.status === 'error' ? <p className="ai-error">Ark 分析接口不可用：{currentState.message}</p> : null}
      {insights?.provider?.status === 'fallback' && insights.provider.error ? (
        <p className="ai-error">Ark 请求失败，已切换本地兜底：{insights.provider.error}</p>
      ) : null}
      {insights ? (
        <>
          <p className="section-ai-summary">{insights.summary}</p>
          <div className="section-ai-groups">
            {groups.map((group) => (
              <InsightGroup group={group} sourceLookup={sourceLookup} key={group.key} />
            ))}
          </div>
        </>
      ) : (
        <p className="section-ai-empty">使用上方预设提示词，只分析当前板块数据。</p>
      )}
    </section>
  )
}

function InsightGroup({
  group,
  sourceLookup,
}: {
  group: { key: string; title: string; items: AiInsightItem[] }
  sourceLookup: Map<string, string>
}) {
  return (
    <section className={`section-ai-group section-ai-group-${group.key}`}>
      <h4>{group.title}</h4>
      <ul>
        {group.items.map((item) => (
          <SectionAiItem item={item} sourceLookup={sourceLookup} key={item.text} />
        ))}
      </ul>
    </section>
  )
}

function SectionAiItem({ item, sourceLookup }: { item: AiInsightItem; sourceLookup: Map<string, string> }) {
  return (
    <li>
      <span>{item.text}</span>
      {item.sourceRefs?.length ? <small>{item.sourceRefs.map((ref) => sourceLookup.get(ref) ?? ref).join(' / ')}</small> : null}
    </li>
  )
}

function providerLabel(status: string, insights?: AiInsights) {
  if (status === 'ark') return `Ark ${insights?.provider?.model ?? ''}`.trim()
  if (status === 'loading') return 'Ark 分析中'
  if (status === 'idle') return '待分析'
  if (status === 'not_configured') return 'Ark 未配置'
  return '本地兜底'
}

function stableStringify(value: unknown) {
  try {
    return JSON.stringify(value, (_key, item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item
      return Object.keys(item as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
        result[key] = (item as Record<string, unknown>)[key]
        return result
      }, {})
    })
  } catch {
    return ''
  }
}
