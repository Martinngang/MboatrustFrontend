import { useState } from 'react'
import { useCustomFields } from '../../customFields'
import { C, FONT } from '../MobileLayout'

/** Read-only tag chips for a DataTable cell. */
export function TagsCell({ entityId }: { entityId: string }) {
  const { getFields } = useCustomFields()
  const tags = getFields(entityId).tags
  if (tags.length === 0) return <span style={{ color: C.inkSubtle }}>—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} style={{ fontFamily: FONT.mono, color: C.inkMuted, background: C.parchment }} className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider">{t}</span>
      ))}
    </div>
  )
}

/** Editable personal note + tag chips, used inside a Drawer preview. Keyed
 * (via `key={entityId}` at the call site) so switching between entities
 * resets the local note draft instead of leaking stale text. */
export function CustomFieldsEditor({ entityId }: { entityId: string }) {
  const { getFields, setNote, addTag, removeTag } = useCustomFields()
  const fields = getFields(entityId)
  const [noteDraft, setNoteDraft] = useState(fields.note)
  const [tagDraft, setTagDraft] = useState('')

  return (
    <div>
      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Your notes & tags</div>
      <textarea
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={() => setNote(entityId, noteDraft)}
        rows={2}
        placeholder="Personal note — only visible to you…"
        className="w-full resize-none rounded-lg border px-3 py-2 text-xs outline-none"
        style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {fields.tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px]" style={{ fontFamily: FONT.mono, color: C.inkMuted, background: C.parchment }}>
            {t}
            <button onClick={() => removeTag(entityId, t)} aria-label={`Remove tag ${t}`} className="leading-none">×</button>
          </span>
        ))}
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && tagDraft.trim()) { addTag(entityId, tagDraft); setTagDraft('') } }}
          placeholder="+ tag"
          className="w-16 border-none bg-transparent text-[10px] outline-none"
          style={{ fontFamily: FONT.mono, color: C.inkSubtle }}
        />
      </div>
    </div>
  )
}
