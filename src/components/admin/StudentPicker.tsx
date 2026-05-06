'use client'

import { useState, useRef, useEffect } from 'react'

interface Student {
  id: string
  name: string
}

interface Props {
  students: Student[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  placeholder?: string
  single?: boolean // true면 1명만 선택 가능
}

export default function StudentPicker({ students, selected, onChange, placeholder = '학생 선택', single = false }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const allChecked = students.length > 0 && selected.size === students.length

  function toggle(id: string) {
    if (single) {
      onChange(selected.has(id) ? new Set() : new Set([id]))
    } else {
      const n = new Set(selected)
      n.has(id) ? n.delete(id) : n.add(id)
      onChange(n)
    }
  }

  function toggleAll() {
    if (allChecked) onChange(new Set())
    else onChange(new Set(students.map(s => s.id)))
  }

  // 표시 텍스트
  let label = placeholder
  if (selected.size === 1) {
    const s = students.find(x => x.id === [...selected][0])
    label = s ? `${s.name} (${s.id})` : [...selected][0]
  } else if (selected.size > 1) {
    if (allChecked) label = `전체 ${students.length}명`
    else label = `${selected.size}명 선택`
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* 드롭다운 트리거 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 4, background: '#fff',
          fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', color: selected.size > 0 ? '#111' : '#999',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 10, color: '#999', flexShrink: 0, marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* 드롭다운 패널 */}
      {open && (
        <div style={{
          position: 'absolute', top: 36, left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #c8cdd6', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxHeight: 240, overflowY: 'auto',
        }}>
          {/* 전체 선택 (multi만) */}
          {!single && students.length > 1 && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              borderBottom: '1px solid #eee', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#003366',
            }}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ accentColor: '#003366' }} />
              전체 선택 ({students.length}명)
            </label>
          )}
          {/* 학생 목록 */}
          {students.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 12, color: '#999' }}>학생이 없습니다</div>
          )}
          {students.map(s => (
            <label
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                cursor: 'pointer', fontSize: 12, transition: 'background .1s',
                background: selected.has(s.id) ? '#f0f4ff' : 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = selected.has(s.id) ? '#e0e8f8' : '#f8f9fb')}
              onMouseLeave={e => (e.currentTarget.style.background = selected.has(s.id) ? '#f0f4ff' : 'transparent')}
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                style={{ accentColor: '#003366' }}
              />
              <span style={{ fontWeight: selected.has(s.id) ? 600 : 400 }}>{s.name}</span>
              <span style={{ color: '#999', fontSize: 11 }}>({s.id})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
