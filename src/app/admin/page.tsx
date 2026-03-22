'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MockBar from '@/components/layout/MockBar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { HARDCODED_ACCOUNTS } from '@/lib/auth'
import type { SampleCase, Assignment, PracticeRecord } from '@/types'
import { calculateScore, generateFeedback } from '@/lib/scoring'

const SB_URL = 'https://knpvayujykoqjncctxrr.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucHZheXVqeWtvcWpuY2N0eHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3NDUsImV4cCI6MjA4OTE0Njc0NX0.rXlo5IsOW6FS5N1X3vgqNM1RvzB84TYPqVhnYyc6FSg'
const SB_HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

interface AccountRow {
  login_id: string
  password?: string
  name: string
  org: string
  role: string
  cohort: string
  bar_num: string
  email: string
  isHardcoded?: boolean
}

const ACC_KEY = 'ec_acc'

function getLocalAccounts(): Record<string, AccountRow> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(ACC_KEY) || '{}') } catch { return {} }
}

function getAllAccounts(): AccountRow[] {
  const localAccs = getLocalAccounts()
  // Build from HARDCODED_ACCOUNTS
  const merged: Record<string, AccountRow> = {}
  Object.entries(HARDCODED_ACCOUNTS).forEach(([id, acc]) => {
    merged[id] = { login_id: id, name: acc.name, org: acc.org, role: acc.role, cohort: '', bar_num: acc.barNum, email: acc.email, isHardcoded: true }
  })
  // localStorage overrides (same id wins for local)
  Object.entries(localAccs).forEach(([id, acc]) => {
    merged[id] = { ...(acc as AccountRow), login_id: id, isHardcoded: false }
  })
  return Object.values(merged)
}

type Panel = 'dashboard' | 'accounts' | 'cases' | 'assign' | 'records' | 'ecfs-cases' | 'settings'

const PANEL_ITEMS: { key: Panel; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '📊', label: '대시보드' },
  { key: 'accounts', icon: '👥', label: '계정 관리' },
  { key: 'cases', icon: '📋', label: '사건 관리' },
  { key: 'assign', icon: '🎯', label: '학생 배정' },
  { key: 'records', icon: '📈', label: '실습 현황' },
  { key: 'ecfs-cases', icon: '⚖️', label: '전자소송 가상사건' },
  { key: 'settings', icon: '⚙', label: '설정' },
]

const STUDENT_IDS = Object.entries(HARDCODED_ACCOUNTS)
  .filter(([, v]) => v.role === 'student')
  .map(([id]) => id)

const COURT_OPTIONS = ['서울중앙지방법원', '서울동부지방법원', '서울서부지방법원', '서울남부지방법원', '서울북부지방법원', '수원지방법원', '인천지방법원', '부산지방법원']
const CASE_TYPE_OPTIONS = ['대여금', '손해배상', '매매대금', '임금', '부당이득금', '소유권이전등기', '기타']

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: '#1a3a6b', color: '#fff', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
      ✅ {message}
    </div>
  )
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [activePanel, setActivePanel] = useState<Panel>('dashboard')
  const [toast, setToast] = useState<string | null>(null)
  const [siteTitle, setSiteTitle] = useState('전자소송 실습 관리자')

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    const update = () => {
      const name = localStorage.getItem('site_name')
      if (name && name.trim()) {
        setSiteTitle(name.trim() + ' 관리자')
        document.title = name.trim()
      }
    }
    update()
    window.addEventListener('site-settings-updated' as keyof WindowEventMap, update)
    return () => window.removeEventListener('site-settings-updated' as keyof WindowEventMap, update)
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#0067c2', fontSize: 18 }}>로딩 중...</span>
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  function showToast(msg: string) {
    setToast(msg)
  }

  // ─────────────────────────────────────────────
  // Dashboard Panel
  // ─────────────────────────────────────────────
  function DashboardPanel() {
    const [stats, setStats] = useState({
      practiceCount: 0,
      avgScore: 0,
      weekCount: 0,
      assignmentCount: 0,
      loaded: false,
    })

    useEffect(() => {
      async function load() {
        const monday = new Date()
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
        monday.setHours(0, 0, 0, 0)

        const [prJson, assignRes] = await Promise.all([
          fetch('/api/admin/records').then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`${SB_URL}/rest/v1/assignments?select=id`, { headers: SB_HDR }).then(r => r.json()),
        ])

        const records = prJson.data || []
        const total = records.length
        const avg = total > 0 ? Math.round(records.reduce((s: number, r: { score: number }) => s + r.score, 0) / total) : 0
        const week = records.filter((r: { created_at: string }) => new Date(r.created_at) >= monday).length

        setStats({
          practiceCount: total,
          avgScore: avg,
          weekCount: week,
          assignmentCount: Array.isArray(assignRes) ? assignRes.length : 0,
          loaded: true,
        })
      }
      load()
    }, [])

    const totalAccounts = Object.keys(HARDCODED_ACCOUNTS).length
    const studentCount = STUDENT_IDS.length

    const cards = [
      { label: '전체 계정', value: totalAccounts, color: '#1a3a6b', bg: '#eef2fb' },
      { label: '실습생 수', value: studentCount, color: '#0067c2', bg: '#dbeafe' },
      { label: '총 실습기록', value: stats.loaded ? stats.practiceCount : '-', color: '#7c3aed', bg: '#f3e8ff' },
      { label: '평균 점수', value: stats.loaded ? `${stats.avgScore}점` : '-', color: '#16a34a', bg: '#dcfce7' },
      { label: '이번 주 제출', value: stats.loaded ? stats.weekCount : '-', color: '#d97706', bg: '#fef3c7' },
      { label: '배정된 사건', value: stats.loaded ? stats.assignmentCount : '-', color: '#dc2626', bg: '#fee2e2' },
    ]

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 20 }}>📊 대시보드</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {cards.map(c => (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}22`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fffbf0', border: '1px solid #f0e0b0', borderRadius: 8, padding: '16px 20px', color: '#7c5800' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ 실습 모드 안내</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            본 시스템은 <strong>전자소송 실습 전용 모의 플랫폼</strong>입니다. 실제 법원 접수 시스템과 무관하며, 작성된 소장 및 제출 내용은 법적 효력이 없습니다.<br />
            실습생이 소장을 제출하면 AI가 자동으로 채점하고 피드백을 제공합니다. 관리자는 사건을 배정하고 실습 현황을 모니터링할 수 있습니다.
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Account Management Panel
  // ─────────────────────────────────────────────
  function AccountsPanel() {
    const [rows, setRows] = useState<AccountRow[]>([])
    const [search, setSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showAddForm, setShowAddForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState<{ ids: string[]; label: string } | null>(null)
    const [form, setForm] = useState({ login_id: '', password: '', name: '', org: '', email: '', role: 'student' })
    const [editModal, setEditModal] = useState<{ login_id: string; name: string; org: string; email: string; password: string } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    // admin만 삭제 불가
    const PROTECTED_IDS = new Set(['admin'])
    // 삭제된 hardcoded 계정 목록 (ec_del)
    const DEL_KEY = 'ec_del'

    function getDeletedSet(): Set<string> {
      try { return new Set(JSON.parse(localStorage.getItem(DEL_KEY) || '[]')) } catch { return new Set() }
    }

    const DEFAULT_IDS = [
      'student01','student02','student03','student04','student05',
      'student06','student07','student08','student09','student10','admin',
    ]

    function loadRows() {
      const localAccs = getLocalAccounts()
      const deleted = getDeletedSet()
      // 1) DEFAULT_ACC 먼저 — 삭제된 것은 제외
      const defaultRows: AccountRow[] = DEFAULT_IDS
        .filter(id => !deleted.has(id))
        .map(id => {
          const a = HARDCODED_ACCOUNTS[id]
          return { login_id: id, name: a.name, org: a.org, role: a.role, cohort: '', bar_num: a.barNum, email: a.email, isHardcoded: PROTECTED_IDS.has(id) }
        })
      // 2) localStorage에만 있는 계정
      const extraRows: AccountRow[] = Object.entries(localAccs)
        .filter(([id]) => !HARDCODED_ACCOUNTS[id])
        .map(([id, a]) => ({ ...(a as AccountRow), login_id: id, isHardcoded: false }))
      setRows([...defaultRows, ...extraRows])
    }

    useEffect(() => { loadRows() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const filtered = rows.filter(a =>
      a.login_id.includes(search) || a.name.includes(search) || (a.org || '').includes(search)
    )

    function toggleId(id: string) {
      setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    function handleAdd() {
      if (!form.login_id || !form.password || !form.name) { alert('아이디, 비밀번호, 이름은 필수입니다.'); return }
      try {
        const stored = getLocalAccounts()
        stored[form.login_id] = { ...form } as AccountRow
        localStorage.setItem(ACC_KEY, JSON.stringify(stored))
        setForm({ login_id: '', password: '', name: '', org: '', email: '', role: 'student' })
        setShowAddForm(false)
        loadRows()
        showToast('계정이 추가되었습니다.')
      } catch (e) { alert('추가 실패: ' + String(e)) }
    }

    function execDelete(ids: string[]) {
      const stored = getLocalAccounts()
      const deleted = getDeletedSet()
      ids.forEach(id => {
        if (HARDCODED_ACCOUNTS[id]) {
          deleted.add(id) // hardcoded → ec_del에 추가
        } else {
          delete stored[id] // local → ec_acc에서 삭제
        }
      })
      localStorage.setItem(ACC_KEY, JSON.stringify(stored))
      localStorage.setItem(DEL_KEY, JSON.stringify([...deleted]))
      setSelectedIds(new Set())
      setDeleteModal(null)
      loadRows()
      showToast(`${ids.length}개 계정이 삭제되었습니다.`)
    }

    function handleEditOpen(acc: AccountRow) {
      const stored = getLocalAccounts()
      const override = stored[acc.login_id]
      setEditModal({
        login_id: acc.login_id,
        name: override?.name || acc.name || '',
        org: override?.org || acc.org || '',
        email: override?.email || acc.email || '',
        password: override?.password || '',
      })
    }

    function saveEdit() {
      if (!editModal) return
      if (!editModal.name.trim()) { alert('이름은 필수입니다.'); return }
      const stored = getLocalAccounts()
      const prev = stored[editModal.login_id] || {}
      stored[editModal.login_id] = {
        ...prev,
        login_id: editModal.login_id,
        name: editModal.name.trim(),
        org: editModal.org.trim(),
        email: editModal.email.trim(),
        ...(editModal.password.trim() ? { password: editModal.password.trim() } : {}),
        role: prev.role || (HARDCODED_ACCOUNTS[editModal.login_id]?.role ?? 'student'),
      }
      localStorage.setItem(ACC_KEY, JSON.stringify(stored))
      setEditModal(null)
      loadRows()
      showToast('계정이 수정되었습니다.')
    }

    function handleDeleteSingle(id: string) {
      if (PROTECTED_IDS.has(id)) return
      const acc = rows.find(r => r.login_id === id)
      setDeleteModal({ ids: [id], label: `'${acc?.name || id}' 계정을 삭제하시겠습니까?` })
    }

    function handleDeleteSelected() {
      const toDelete = Array.from(selectedIds).filter(id => !PROTECTED_IDS.has(id))
      if (toDelete.length === 0) { alert('삭제할 계정을 선택해주세요.'); return }
      setDeleteModal({ ids: toDelete, label: `선택한 ${toDelete.length}개 계정을 삭제하시겠습니까?` })
    }

    async function handleSampleDownload() {
      const xlsx = await import('xlsx')
      const sample = [
        { login_id: 'student11', password: 'court1234', name: '홍길동', org: '바른법률사무소', email: 'hong@example.com', role: 'student' },
        { login_id: 'student12', password: 'court1234', name: '김법무', org: '한결법률사무소', email: 'kim@example.com', role: 'student' },
      ]
      const ws = xlsx.utils.json_to_sheet(sample)
      const wb = xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(wb, ws, '계정목록')
      xlsx.writeFile(wb, '계정_단체추가_샘플.xlsx')
    }

    async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const xlsx = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = xlsx.read(buf)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const jsonRows: Record<string, string>[] = xlsx.utils.sheet_to_json(ws)
        if (!jsonRows.length) { alert('데이터가 없습니다.'); return }
        setSaving(true)
        const stored = getLocalAccounts()
        let ok = 0, fail = 0
        for (const r of jsonRows) {
          const id = String(r['login_id'] || r['아이디'] || '')
          const pw = String(r['password'] || r['비밀번호'] || '')
          const nm = String(r['name'] || r['이름'] || '')
          if (!id || !pw || !nm) { fail++; continue }
          stored[id] = { login_id: id, password: pw, name: nm, org: String(r['org']||r['소속']||''), email: String(r['email']||r['이메일']||''), role: String(r['role']||r['역할']||'student'), cohort: String(r['cohort']||r['기수']||''), bar_num: String(r['bar_num']||r['사원번호']||'') }
          ok++
        }
        localStorage.setItem(ACC_KEY, JSON.stringify(stored))
        setSaving(false)
        loadRows()
        showToast(`${ok}개 계정 등록 완료${fail > 0 ? ` (${fail}개 실패)` : ''}`)
      } catch (err) { setSaving(false); alert('Excel 파싱 오류: ' + String(err)) }
      if (fileRef.current) fileRef.current.value = ''
    }

    const inp: React.CSSProperties = { padding: '7px 10px', border: '1px solid #d0d8e8', borderRadius: 4, fontSize: 13, boxSizing: 'border-box', width: '100%' }
    const extraCount = filtered.filter(a => !a.isHardcoded).length

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>👥 계정 관리</h2>
          <span style={{ fontSize: 13, color: '#888' }}>총 {filtered.length}명</span>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름·아이디·소속 검색..." style={{ ...inp, flex: 1, minWidth: 160 }} />
          <button onClick={() => setShowAddForm(v => !v)} style={{ padding: '7px 14px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + 개별 추가
          </button>
          <label style={{ padding: '7px 14px', background: '#0067c2', color: '#fff', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📂 단체 추가 (Excel)
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} style={{ display: 'none' }} />
          </label>
          <button onClick={handleSampleDownload} style={{ padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ⬇ 샘플 양식
          </button>
            <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0} style={{ padding: '7px 14px', background: selectedIds.size > 0 ? '#dc2626' : '#e5e7eb', color: selectedIds.size > 0 ? '#fff' : '#999', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
            🗑 선택 삭제 ({selectedIds.size})
          </button>
        </div>

        {/* 개별 추가 폼 */}
        {showAddForm && (
          <div style={{ background: '#f8f9fb', border: '1px solid #d0d8e8', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3a6b', marginBottom: 12 }}>신규 계정 추가</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
              {[
                { label: '아이디 *', key: 'login_id' },
                { label: '비밀번호 *', key: 'password' },
                { label: '이름 *', key: 'name' },
                { label: '소속', key: 'org' },
                { label: '이메일', key: 'email' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>{f.label}</label>
                  <input value={(form as Record<string,string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>역할</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inp}>
                  <option value="student">학생</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>
            <div style={{ background: '#f0f7ff', border: '1px solid #b3d9f0', borderRadius: 4, padding: '7px 12px', fontSize: 11, color: '#1a4a6b', marginBottom: 10 }}>
              📋 Excel 열 순서: <strong>login_id · password · name · org · email · role</strong> (또는 한글: 아이디·비밀번호·이름·소속·이메일·역할)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddForm(false)} style={{ padding: '7px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={handleAdd} disabled={saving} style={{ padding: '7px 20px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                추가하기
              </button>
            </div>
          </div>
        )}

        {/* 계정 목록 테이블 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '1px solid #d0d8e8', borderRadius: 6, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#1a3a6b', color: '#fff' }}>
              <th style={{ padding: '9px 12px', width: 36, textAlign: 'center' }}>
                <input type="checkbox"
                  checked={filtered.filter(a => !a.isHardcoded).length > 0 && filtered.filter(a => !a.isHardcoded).every(a => selectedIds.has(a.login_id))}
                  onChange={e => {
                    setSelectedIds(prev => {
                      const n = new Set(prev)
                      filtered.filter(a => !a.isHardcoded).forEach(a => e.target.checked ? n.add(a.login_id) : n.delete(a.login_id))
                      return n
                    })
                  }}
                />
              </th>
              {['아이디', '이름', '소속', '역할', '이메일', '수정', '삭제'].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#999' }}>검색 결과가 없습니다.</td></tr>
            ) : filtered.map(acc => (
              <tr key={acc.login_id} style={{ background: acc.isHardcoded ? '#f5f7fc' : '#fff', borderBottom: '1px solid #e8edf5' }}>
                <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                  {!acc.isHardcoded && (
                    <input type="checkbox" checked={selectedIds.has(acc.login_id)} onChange={() => toggleId(acc.login_id)} />
                  )}
                </td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#0067c2', fontWeight: 600 }}>{acc.login_id}</td>
                <td style={{ padding: '7px 12px', fontWeight: 600 }}>{acc.name}</td>
                <td style={{ padding: '7px 12px', color: '#555' }}>{acc.org || '-'}</td>
                <td style={{ padding: '7px 12px' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: acc.role === 'admin' ? '#fee2e2' : '#dbeafe', color: acc.role === 'admin' ? '#dc2626' : '#1d4ed8' }}>
                    {acc.role === 'admin' ? '관리자' : '학생'}
                  </span>
                  {acc.isHardcoded && <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6, border: '1px solid #d1d5db', borderRadius: 3, padding: '1px 5px' }}>기본</span>}
                </td>
                <td style={{ padding: '7px 12px', color: '#666' }}>{acc.email || '-'}</td>
                <td style={{ padding: '7px 12px' }}>
                  {/* 수정: 새로 추가한 관리자(role=admin, !isHardcoded)는 불가 */}
                  {!(acc.role === 'admin' && !acc.isHardcoded)
                    ? <button onClick={() => handleEditOpen(acc)} style={{ background: '#0067c2', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>수정</button>
                    : <span style={{ fontSize: 11, color: '#c0c0c0' }}>–</span>
                  }
                </td>
                <td style={{ padding: '7px 12px' }}>
                  {acc.isHardcoded
                    ? <span style={{ fontSize: 11, color: '#c0c0c0' }}>–</span>
                    : <button onClick={() => handleDeleteSingle(acc.login_id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 수정 모달 */}
        {editModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 10, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,.25)', overflow: 'hidden' }}>
              <div style={{ background: '#0067c2', color: '#fff', padding: '14px 20px', fontWeight: 700, fontSize: 15 }}>✏️ 계정 수정 — {editModal.login_id}</div>
              <div style={{ padding: '20px' }}>
                {[
                  { label: '이름 *', key: 'name', type: 'text' },
                  { label: '소속', key: 'org', type: 'text' },
                  { label: '이메일', key: 'email', type: 'text' },
                  { label: '새 비밀번호 (변경 시만 입력)', key: 'password', type: 'password' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input
                      type={f.type}
                      value={(editModal as Record<string, string>)[f.key]}
                      onChange={e => setEditModal(p => p ? { ...p, [f.key]: e.target.value } : p)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d0d8e8', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                {editModal.login_id === 'admin' && (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 4, padding: '8px 12px', fontSize: 11, color: '#9a3412', marginBottom: 12 }}>
                    ⚠️ 관리자 비밀번호 변경 시 기존 admin1234로는 로그인할 수 없습니다.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
                <button onClick={() => setEditModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: '#f5f5f5', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                <button onClick={saveEdit} style={{ flex: 1, padding: '10px', background: '#0067c2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>저장</button>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        {deleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 10, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,.25)', overflow: 'hidden' }}>
              <div style={{ background: '#dc2626', color: '#fff', padding: '14px 20px', fontWeight: 700, fontSize: 15 }}>⚠️ 계정 삭제</div>
              <div style={{ padding: '24px 20px', fontSize: 14, color: '#333', lineHeight: 1.7 }}>
                {deleteModal.label}<br />
                <span style={{ fontSize: 12, color: '#888' }}>삭제 후에는 해당 계정으로 로그인할 수 없습니다.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
                <button onClick={() => setDeleteModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: '#f5f5f5', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                <button onClick={() => execDelete(deleteModal.ids)} style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Cases Management Panel
  // ─────────────────────────────────────────────
  function CasesPanel() {
    const [cases, setCases] = useState<SampleCase[]>([])
    const [casesLoading, setCasesLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null)
    const [deleting, setDeleting] = useState(false)
    const BLANK_FORM = { title: '', case_type: '대여금', court: '서울중앙지방법원', plaintiff: '', defendant: '', claim_amount: '', background: '', key_facts: '', evidence_hint: '', claim_purpose: '', claim_reason: '', difficulty: '보통' }
    const [form, setForm] = useState(BLANK_FORM)

    const fetchCases = useCallback(async () => {
      setCasesLoading(true)
      const { data } = await supabase.from('sample_cases').select('*').order('created_at', { ascending: false })
      setCases(data || [])
      setCasesLoading(false)
    }, [])

    useEffect(() => { fetchCases() }, [fetchCases])

    function openAdd() { setForm(BLANK_FORM); setEditId(null); setShowModal(true) }
    function openEdit(c: SampleCase) {
      setForm({
        title: c.title, case_type: c.case_type, court: c.court,
        plaintiff: c.plaintiff, defendant: c.defendant,
        claim_amount: c.claim_amount ? String(c.claim_amount) : '',
        background: c.background || '', key_facts: c.key_facts || '',
        evidence_hint: c.evidence_hint || '', claim_purpose: c.claim_purpose || '',
        claim_reason: c.claim_reason || '', difficulty: c.difficulty || '보통',
      })
      setEditId(c.id)
      setShowModal(true)
    }

    async function handleSave() {
      if (!form.title || !form.plaintiff || !form.defendant) {
        alert('제목, 원고, 피고는 필수입니다.')
        return
      }
      setSaving(true)
      const payload = {
        title: form.title, case_type: form.case_type, court: form.court,
        plaintiff: form.plaintiff, defendant: form.defendant,
        claim_amount: form.claim_amount ? Number(form.claim_amount) : null,
        background: form.background || null, key_facts: form.key_facts || null,
        evidence_hint: form.evidence_hint || null, claim_purpose: form.claim_purpose || null,
        claim_reason: form.claim_reason || null, difficulty: form.difficulty,
      }
      const { error } = editId
        ? await supabase.from('sample_cases').update(payload).eq('id', editId)
        : await supabase.from('sample_cases').insert({ ...payload, is_active: true })
      setSaving(false)
      if (error) { alert('저장 실패: ' + error.message); return }
      setShowModal(false); setEditId(null); setForm(BLANK_FORM)
      fetchCases()
      showToast(editId ? '사건이 수정되었습니다.' : '사건이 추가되었습니다.')
    }

    async function handleDelete() {
      if (!deleteModal) return
      setDeleting(true)
      const { error } = await supabase.from('sample_cases').delete().eq('id', deleteModal.id)
      setDeleting(false)
      if (error) { alert('삭제 실패: ' + error.message); return }
      setDeleteModal(null)
      fetchCases()
      showToast('사건이 삭제되었습니다.')
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>📋 사건 관리</h2>
          <button
            onClick={openAdd}
            style={{ padding: '8px 18px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            + 새 사건 추가
          </button>
        </div>

        {casesLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#0067c2' }}>로딩 중...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a3a6b', color: '#fff' }}>
                  {['제목', '유형', '법원', '원고', '피고', '난이도', '생성일', '수정', '삭제'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: '#999' }}>등록된 사건이 없습니다.</td></tr>
                ) : cases.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1a3a6b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                    <td style={{ padding: '9px 12px' }}><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{c.case_type}</span></td>
                    <td style={{ padding: '9px 12px', color: '#555', whiteSpace: 'nowrap' }}>{c.court}</td>
                    <td style={{ padding: '9px 12px' }}>{c.plaintiff}</td>
                    <td style={{ padding: '9px 12px' }}>{c.defendant}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ color: c.difficulty === '어려움' ? '#dc2626' : c.difficulty === '쉬움' ? '#16a34a' : '#d97706', fontWeight: 600, fontSize: 12 }}>
                        {c.difficulty || '보통'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#888', whiteSpace: 'nowrap' }}>{c.created_at?.slice(0, 10)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <button onClick={() => openEdit(c)} style={{ background: '#0067c2', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>수정</button>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <button onClick={() => setDeleteModal({ id: c.id, title: c.title })} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Case Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, width: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.25)' }}>
              <div style={{ background: '#1a3a6b', color: '#fff', padding: '14px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '사건 수정' : '새 사건 추가'}</span>
                <button onClick={() => { setShowModal(false); setEditId(null); setForm(BLANK_FORM) }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: '제목 *', key: 'title', type: 'text' },
                  { label: '원고 *', key: 'plaintiff', type: 'text' },
                  { label: '피고 *', key: 'defendant', type: 'text' },
                  { label: '청구금액 (원)', key: 'claim_amount', type: 'number' },
                  { label: '청구취지', key: 'claim_purpose', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input
                      type={f.type}
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>사건유형</label>
                  <select value={form.case_type} onChange={e => setForm(prev => ({ ...prev, case_type: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}>
                    {CASE_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>법원</label>
                  <select value={form.court} onChange={e => setForm(prev => ({ ...prev, court: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}>
                    {COURT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>난이도</label>
                  <select value={form.difficulty} onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}>
                    {['쉬움', '보통', '어려움'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>사건배경</label>
                  <textarea
                    value={form.background}
                    onChange={e => setForm(prev => ({ ...prev, background: e.target.value }))}
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>주요 사실관계</label>
                  <textarea
                    value={form.key_facts}
                    onChange={e => setForm(prev => ({ ...prev, key_facts: e.target.value }))}
                    rows={4}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>입증서류 힌트</label>
                  <textarea
                    value={form.evidence_hint}
                    onChange={e => setForm(prev => ({ ...prev, evidence_hint: e.target.value }))}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>청구원인</label>
                  <textarea
                    value={form.claim_reason}
                    onChange={e => setForm(prev => ({ ...prev, claim_reason: e.target.value }))}
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => { setShowModal(false); setEditId(null); setForm(BLANK_FORM) }} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: '#f5f5f5', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>취소</button>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? '저장 중...' : editId ? '수정하기' : '저장하기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Case Modal */}
        {deleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 10, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,.25)', overflow: 'hidden' }}>
              <div style={{ background: '#dc2626', color: '#fff', padding: '14px 20px', fontWeight: 700, fontSize: 15 }}>⚠️ 사건 삭제</div>
              <div style={{ padding: '24px 20px', fontSize: 14, color: '#333', lineHeight: 1.7 }}>
                <strong>'{deleteModal.title}'</strong> 사건을 삭제하시겠습니까?<br />
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>⚠️ 삭제 후 복구할 수 없습니다.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
                <button onClick={() => setDeleteModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: '#f5f5f5', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Assignment Panel
  // ─────────────────────────────────────────────
  function AssignPanel() {
    const [cases, setCases] = useState<SampleCase[]>([])
    const [selectedCase, setSelectedCase] = useState<string>('')
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
    const [assigning, setAssigning] = useState(false)
    const [currentAssignments, setCurrentAssignments] = useState<(Assignment & { sample_cases?: SampleCase })[]>([])
    const [assignLoading, setAssignLoading] = useState(true)

    const [dueDate, setDueDate] = useState('')

    function saveAssignmentLocal(userId: string, caseId: number, due: string) {
      const key = 'ec_assignments'
      const all = JSON.parse(localStorage.getItem(key) || '[]')
      all.push({
        id: Date.now(),
        user_id: userId,
        case_id: caseId,
        due_date: due || null,
        status: '미제출',
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      localStorage.setItem(key, JSON.stringify(all))
    }

    async function assignCase(userId: string, caseId: number, due: string) {
      try {
        const res = await fetch(`${SB_URL}/rest/v1/assignments`, {
          method: 'POST',
          headers: { ...SB_HDR, Prefer: 'return=minimal' },
          body: JSON.stringify({ user_id: userId, case_id: caseId, due_date: due || null, status: '미제출' }),
        })
        if (!res.ok) {
          // Supabase 실패 시 localStorage에 저장
          saveAssignmentLocal(userId, caseId, due)
        }
      } catch {
        saveAssignmentLocal(userId, caseId, due)
      }
      return true
    }

    const fetchData = useCallback(async () => {
      setAssignLoading(true)
      const [casesData, assignData] = await Promise.all([
        supabase.from('sample_cases').select('*').order('created_at', { ascending: false }).then(r => r.data || []),
        fetch(`${SB_URL}/rest/v1/assignments?select=*&order=id.desc`, {
          headers: SB_HDR,
        }).then(r => r.json()).catch(() => []),
      ])
      // localStorage 데이터와 합치기
      const localAssign: unknown[] = JSON.parse(localStorage.getItem('ec_assignments') || '[]')
      const sbRows: unknown[] = Array.isArray(assignData) && !((assignData as {code?:string}[])[0]?.code) ? assignData : []
      const merged = [...sbRows, ...localAssign]
      // 중복 제거 (case_id + user_id 기준)
      const seen = new Set<string>()
      const deduped = merged.filter((a) => {
        const key = `${(a as {user_id?:string}).user_id}-${(a as {case_id?:number}).case_id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setCases(casesData)
      setCurrentAssignments(deduped as typeof currentAssignments)
      setAssignLoading(false)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData() }, [fetchData])

    function toggleStudent(id: string) {
      setSelectedStudents(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    function toggleAll() {
      if (selectedStudents.size === STUDENT_IDS.length) setSelectedStudents(new Set())
      else setSelectedStudents(new Set(STUDENT_IDS))
    }

    async function deleteAssignment(id: string) {
      await fetch(`${SB_URL}/rest/v1/assignments?id=eq.${id}`, {
        method: 'DELETE',
        headers: SB_HDR,
      })
      fetchData()
    }

    async function handleAssign() {
      if (!selectedCase) { alert('사건을 선택해주세요.'); return }
      if (selectedStudents.size === 0) { alert('학생을 선택해주세요.'); return }
      setAssigning(true)
      try {
        let skipped = 0
        for (const uid of Array.from(selectedStudents)) {
          const isDup = currentAssignments.some(a =>
            ((a as Assignment & { user_id?: string }).user_id || a.student_id) === uid &&
            String(a.case_id) === selectedCase
          )
          if (isDup) { skipped++; continue }
          await assignCase(uid, Number(selectedCase), dueDate)
        }
        const assigned = selectedStudents.size - skipped
        if (assigned > 0) showToast(`${assigned}명에게 배정 완료!${skipped > 0 ? ` (${skipped}명 중복 제외)` : ''}`)
        else alert(`모두 이미 배정된 사건입니다.`)
        setSelectedStudents(new Set())
        setSelectedCase('')
        setDueDate('')
        fetchData()
      } catch (e) {
        alert('배정 실패: ' + String(e))
      } finally {
        setAssigning(false)
      }
    }

    // Group assignments by user_id
    const assignByStudent: Record<string, typeof currentAssignments> = {}
    currentAssignments.forEach(a => {
      const uid = (a as Assignment & { user_id?: string }).user_id || a.student_id
      if (!assignByStudent[uid]) assignByStudent[uid] = []
      assignByStudent[uid].push(a)
    })

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 20 }}>🎯 학생 배정</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          {/* 사건 선택 */}
          <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>1. 사건 선택</div>
            <div style={{ padding: 16 }}>
              <select
                value={selectedCase}
                onChange={e => setSelectedCase(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}
              >
                <option value="">-- 사건을 선택하세요 --</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.case_type})</option>
                ))}
              </select>
              {selectedCase && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0f6ff', border: '1px solid #c8d8f0', borderRadius: 6, fontSize: 12, color: '#1a3a6b' }}>
                  {(() => {
                    const sc = cases.find(c => String(c.id) === selectedCase)
                    return sc ? `${sc.plaintiff} vs ${sc.defendant} | ${sc.court}` : ''
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* 학생 선택 */}
          <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>2. 학생 선택</div>
            <div style={{ padding: '10px 16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0067c2', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedStudents.size === STUDENT_IDS.length} onChange={toggleAll} />
                전체 선택/해제
              </label>
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {STUDENT_IDS.map(id => {
                  const acc = HARDCODED_ACCOUNTS[id]
                  return (
                    <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '3px 0' }}>
                      <input type="checkbox" checked={selectedStudents.has(id)} onChange={() => toggleStudent(id)} />
                      <span style={{ fontWeight: 600, color: '#1a3a6b' }}>{acc.name}</span>
                      <span style={{ fontSize: 11, color: '#888' }}>({id})</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>마감일 (선택)</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}
          />
        </div>
        <button
          onClick={handleAssign}
          disabled={assigning}
          style={{ display: 'block', width: '100%', padding: '12px', background: assigning ? '#999' : 'linear-gradient(90deg,#1a3a6b,#2952a3)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: assigning ? 'not-allowed' : 'pointer', marginBottom: 28 }}
        >
          {assigning ? '배정 중...' : `🎯 ${selectedStudents.size}명에게 배정하기`}
        </button>

        {/* Current assignments table */}
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b', marginBottom: 12 }}>현재 배정 현황</h3>
        {assignLoading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>로딩 중...</div>
        ) : Object.keys(assignByStudent).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#999', border: '1px solid #eee', borderRadius: 8 }}>배정된 사건이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(assignByStudent).map(([sid, asgns]) => {
              const acc = HARDCODED_ACCOUNTS[sid]
              return (
                <div key={sid} style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#f0f4fc', padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{acc?.name || sid}</span>
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>({sid}) — {asgns.length}건</span>
                  </div>
                  <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {asgns.map(a => (
                      <span key={a.id} style={{ fontSize: 12, background: '#e8f0fc', color: '#1a3a6b', padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {cases.find(c => String(c.id) === String(a.case_id))?.title || a.case_id}
                        <button
                          onClick={() => deleteAssignment(a.id)}
                          style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}
                          title="배정 삭제"
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Practice Records Panel
  // ─────────────────────────────────────────────
  function RecordsPanel() {
    const [records, setRecords] = useState<PracticeRecord[]>([])
    const [recLoading, setRecLoading] = useState(true)
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
    const [regrading, setRegrading] = useState<Set<string>>(new Set())

    async function load() {
      setRecLoading(true)
      try {
        const res = await fetch('/api/admin/records')
        const json = await res.json()
        if (!res.ok) {
          console.error('[RecordsPanel] API error:', json)
          // fallback: try direct supabase
          const { data, error } = await supabase.from('practice_records').select('*').order('created_at', { ascending: false })
          if (error) console.error('[RecordsPanel] Supabase fallback error:', error)
          setRecords(data || [])
        } else {
          console.log('[RecordsPanel] loaded', json.data?.length, 'records, serviceKey:', json.usingServiceKey)
          setRecords(json.data || [])
        }
      } catch (e) {
        console.error('[RecordsPanel] load error:', e)
      }
      setRecLoading(false)
    }

    useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function regrade(r: PracticeRecord) {
      if (!r.complaint_data) { alert('저장된 소장 데이터가 없습니다.'); return }
      setRegrading(prev => new Set(prev).add(r.id))
      try {
        const { score, breakdown } = calculateScore(r.complaint_data)
        const feedback = generateFeedback(score, breakdown)
        const res = await fetch(`${SB_URL}/rest/v1/practice_records?id=eq.${r.id}`, {
          method: 'PATCH',
          headers: { ...SB_HDR, Prefer: 'return=minimal' },
          body: JSON.stringify({ score, feedback, grade_breakdown: breakdown }),
        })
        if (!res.ok) throw new Error(await res.text())
        await load()
        showToast(`재채점 완료: ${score}점`)
      } catch (e) {
        alert('재채점 실패: ' + String(e))
      } finally {
        setRegrading(prev => { const n = new Set(prev); n.delete(r.id); return n })
      }
    }

    async function deleteRecord(id: string) {
      if (!confirm('이 실습기록을 삭제하시겠습니까?')) return
      const res = await fetch(`${SB_URL}/rest/v1/practice_records?id=eq.${id}`, {
        method: 'DELETE',
        headers: SB_HDR,
      })
      if (res.ok) { await load(); showToast('삭제되었습니다.') }
      else alert('삭제 실패: ' + await res.text())
    }

    // Group by student
    const byStudent: Record<string, PracticeRecord[]> = {}
    records.forEach(r => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = []
      byStudent[r.student_id].push(r)
    })

    const studentSummaries = STUDENT_IDS.map(id => {
      const recs = byStudent[id] || []
      const count = recs.length
      const avg = count > 0 ? Math.round(recs.reduce((s, r) => s + r.score, 0) / count) : 0
      const best = count > 0 ? Math.max(...recs.map(r => r.score)) : 0
      const acc = HARDCODED_ACCOUNTS[id]
      return { id, name: acc?.name || id, count, avg, best, recs }
    }).filter(s => s.count > 0)

    const selectedRecs = selectedStudent ? byStudent[selectedStudent] || [] : []
    const selectedAcc = selectedStudent ? HARDCODED_ACCOUNTS[selectedStudent] : null

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 20 }}>📈 실습 현황</h2>

        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
          💡 기록이 보이지 않으면 학생에게 <b>마이페이지 → 나의 실습기록 → 기록 동기화</b> 버튼을 클릭하도록 안내하세요.
        </div>

        {recLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#0067c2' }}>로딩 중...</div>
        ) : studentSummaries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>제출된 실습기록이 없습니다.<br /><span style={{ fontSize: 12 }}>학생이 마이페이지에서 기록 동기화를 해야 표시됩니다.</span></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
              {studentSummaries.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(selectedStudent === s.id ? null : s.id)}
                  style={{
                    border: `2px solid ${selectedStudent === s.id ? '#0067c2' : '#d0d8e8'}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    background: selectedStudent === s.id ? '#eef2fb' : '#fff',
                    transition: 'all .15s',
                    boxShadow: selectedStudent === s.id ? '0 2px 10px rgba(0,103,194,.15)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3a6b', marginBottom: 6 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{s.id}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0067c2' }}>{s.count}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>제출</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.avg >= 75 ? '#16a34a' : s.avg >= 60 ? '#d97706' : '#dc2626' }}>{s.avg}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>평균</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>{s.best}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>최고</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedStudent && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b', marginBottom: 12 }}>
                  {selectedAcc?.name} ({selectedStudent}) 상세 기록
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1a3a6b', color: '#fff' }}>
                        {['점수', '사건유형', '법원', '원고', '피고', '피드백', '제출일', '재채점', '삭제'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecs.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13,
                              background: r.score >= 90 ? '#dcfce7' : r.score >= 75 ? '#dbeafe' : r.score >= 60 ? '#fef3c7' : '#fee2e2',
                              color: r.score >= 90 ? '#16a34a' : r.score >= 75 ? '#2563eb' : r.score >= 60 ? '#d97706' : '#dc2626',
                            }}>
                              {r.score}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px' }}>{r.case_type || '-'}</td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{r.court || '-'}</td>
                          <td style={{ padding: '9px 12px' }}>{r.plaintiff || '-'}</td>
                          <td style={{ padding: '9px 12px' }}>{r.defendant || '-'}</td>
                          <td style={{ padding: '9px 12px', maxWidth: 200 }}>
                            <span style={{ fontSize: 12, color: '#555', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {r.feedback || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: '#888' }}>{r.created_at?.slice(0, 10)}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <button
                              onClick={() => regrade(r)}
                              disabled={regrading.has(r.id)}
                              style={{ height: 28, padding: '0 12px', background: regrading.has(r.id) ? '#ccc' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: regrading.has(r.id) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                            >
                              {regrading.has(r.id) ? '채점중…' : '🔄 재채점'}
                            </button>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <button
                              onClick={() => deleteRecord(r.id)}
                              style={{ height: 28, padding: '0 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                            >
                              🗑 삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // EcfsCases Panel — 전자소송 가상사건 관리
  // ─────────────────────────────────────────────
  function EcfsCasesPanel() {
    interface VCase {
      id: string; caseYear: string; caseGubun: string; caseNum: string
      court: string; plaintiff: string; defendant: string; caseName: string
    }
    const DEFAULT: VCase[] = [
      { id: 'd1', caseYear: '2026', caseGubun: '가단', caseNum: '11234', court: '서울중앙지방법원', plaintiff: '홍길동', defendant: '이순신', caseName: '손해배상' },
      { id: 'd2', caseYear: '2026', caseGubun: '가단', caseNum: '22345', court: '수원지방법원', plaintiff: '홍길동', defendant: '김철수', caseName: '대여금' },
      { id: 'd3', caseYear: '2025', caseGubun: '가단', caseNum: '33456', court: '인천지방법원', plaintiff: '김정호', defendant: '주식회사 사아자컨설팅', caseName: '물품대금' },
      { id: 'd4', caseYear: '2026', caseGubun: '가단', caseNum: '44567', court: '서울동부지방법원', plaintiff: '박민수', defendant: '이재영', caseName: '임대차보증금' },
      { id: 'd5', caseYear: '2025', caseGubun: '타채', caseNum: '55001', court: '서울중앙지방법원', plaintiff: '이민준', defendant: '주식회사 라마바기술', caseName: '채권압류' },
    ]
    const GUBUN = ['가단','가합','가소','나','머','타채','카합','카단','제가단','제가합','제가소','제나','제머']
    const COURTS = ['서울중앙지방법원','서울서부지방법원','서울동부지방법원','서울남부지방법원','서울북부지방법원','수원지방법원','인천지방법원','의정부지방법원','부산지방법원','대구지방법원','광주지방법원','대전지방법원']

    const BLANK: VCase = { id: '', caseYear: '2026', caseGubun: '가단', caseNum: '', court: '서울중앙지방법원', plaintiff: '', defendant: '', caseName: '' }

    const [list, setList] = useState<VCase[]>([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<VCase>(BLANK)
    const [editId, setEditId] = useState<string | null>(null)
    const [deleteModal, setDeleteModal] = useState<VCase | null>(null)

    function load() {
      try {
        const d = JSON.parse(localStorage.getItem('ecfs_virtual_cases') || 'null')
        setList(Array.isArray(d) && d.length > 0 ? d : DEFAULT)
      } catch { setList(DEFAULT) }
    }
    function save(updated: VCase[]) {
      localStorage.setItem('ecfs_virtual_cases', JSON.stringify(updated))
      setList(updated)
    }

    useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function handleSubmit() {
      if (!form.caseNum.trim()) { alert('사건번호를 입력하세요.'); return }
      if (!form.plaintiff.trim() || !form.defendant.trim()) { alert('원고와 피고를 입력하세요.'); return }
      if (!form.caseName.trim()) { alert('사건명을 입력하세요.'); return }
      const dup = list.find(c => c.caseYear === form.caseYear && c.caseGubun === form.caseGubun && c.caseNum === form.caseNum.trim() && c.id !== editId)
      if (dup) { alert('동일한 사건번호가 이미 존재합니다.'); return }
      if (editId) {
        save(list.map(c => c.id === editId ? { ...form, caseNum: form.caseNum.trim(), id: editId } : c))
        showToast('사건이 수정되었습니다.')
      } else {
        save([...list, { ...form, caseNum: form.caseNum.trim(), id: String(Date.now()) }])
        showToast('사건이 추가되었습니다.')
      }
      setShowForm(false); setEditId(null); setForm(BLANK)
    }
    function startEdit(c: VCase) { setForm(c); setEditId(c.id); setShowForm(true) }
    function confirmDelete() {
      if (!deleteModal) return
      save(list.filter(c => c.id !== deleteModal.id))
      setDeleteModal(null)
      showToast('사건이 삭제되었습니다.')
    }
    function resetToDefault() {
      save(DEFAULT)
      showToast('기본 사건 목록으로 초기화되었습니다.')
    }

    const inp: React.CSSProperties = { padding: '7px 10px', border: '1px solid #d0d8e8', borderRadius: 4, fontSize: 13, boxSizing: 'border-box', width: '100%' }

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>⚖️ 전자소송 가상사건 관리</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={resetToDefault} style={{ padding: '7px 14px', background: '#f0f4fc', color: '#1a3a6b', border: '1px solid #c8d8f0', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>기본값 복원</button>
            <button onClick={() => { setForm(BLANK); setEditId(null); setShowForm(v => !v) }} style={{ padding: '7px 16px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 사건 추가</button>
          </div>
        </div>

        <div style={{ background: '#fffbf0', border: '1px solid #f0e0b0', borderRadius: 6, padding: '10px 16px', fontSize: 12, color: '#7c5800', marginBottom: 14 }}>
          📋 여기서 관리하는 사건은 <strong>전자소송사건등록</strong> 페이지의 사건번호 조회 시 불러올 수 있는 가상 사건 목록입니다.
        </div>

        {/* 추가/수정 폼 */}
        {showForm && (
          <div style={{ background: '#f8f9fb', border: '1px solid #d0d8e8', borderRadius: 8, padding: 18, marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3a6b', marginBottom: 14 }}>{editId ? '사건 수정' : '새 사건 추가'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>사건연도</label>
                <select value={form.caseYear} onChange={e => setForm(p => ({ ...p, caseYear: e.target.value }))} style={inp}>
                  {['2022','2023','2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>구분</label>
                <select value={form.caseGubun} onChange={e => setForm(p => ({ ...p, caseGubun: e.target.value }))} style={inp}>
                  {GUBUN.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>번호 *</label>
                <input value={form.caseNum} onChange={e => setForm(p => ({ ...p, caseNum: e.target.value }))} placeholder="예: 11234" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>법원</label>
                <select value={form.court} onChange={e => setForm(p => ({ ...p, court: e.target.value }))} style={inp}>
                  {COURTS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>사건명 *</label>
                <input value={form.caseName} onChange={e => setForm(p => ({ ...p, caseName: e.target.value }))} placeholder="예: 손해배상" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>원고 *</label>
                <input value={form.plaintiff} onChange={e => setForm(p => ({ ...p, plaintiff: e.target.value }))} placeholder="원고 이름" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 }}>피고 *</label>
                <input value={form.defendant} onChange={e => setForm(p => ({ ...p, defendant: e.target.value }))} placeholder="피고 이름" style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(BLANK) }} style={{ padding: '7px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSubmit} style={{ padding: '7px 24px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{editId ? '수정하기' : '추가하기'}</button>
            </div>
          </div>
        )}

        {/* 사건 목록 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '1px solid #d0d8e8', borderRadius: 6, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#1a3a6b', color: '#fff' }}>
              {['사건번호', '법원', '사건명', '원고', '피고', '수정', '삭제'].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#999' }}>등록된 가상 사건이 없습니다.</td></tr>
            ) : list.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#0067c2', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.caseYear}{c.caseGubun}{c.caseNum}</td>
                <td style={{ padding: '8px 12px', color: '#555', whiteSpace: 'nowrap' }}>{c.court}</td>
                <td style={{ padding: '8px 12px' }}><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{c.caseName}</span></td>
                <td style={{ padding: '8px 12px' }}>{c.plaintiff}</td>
                <td style={{ padding: '8px 12px' }}>{c.defendant}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => startEdit(c)} style={{ background: '#0067c2', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>수정</button>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => setDeleteModal(c)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {deleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 10, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,.25)', overflow: 'hidden' }}>
              <div style={{ background: '#dc2626', color: '#fff', padding: '14px 20px', fontWeight: 700, fontSize: 15 }}>⚠️ 사건 삭제</div>
              <div style={{ padding: '24px 20px', fontSize: 14, color: '#333', lineHeight: 1.7 }}>
                <strong>{deleteModal.caseYear}{deleteModal.caseGubun}{deleteModal.caseNum}</strong> 사건을 삭제하시겠습니까?<br />
                <span style={{ fontSize: 12, color: '#888' }}>({deleteModal.plaintiff} vs {deleteModal.defendant})</span>
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
                <button onClick={() => setDeleteModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: '#f5f5f5', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                <button onClick={confirmDelete} style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }


  // ─────────────────────────────────────────────
  // Settings Panel
  // ─────────────────────────────────────────────
  function SettingsPanel() {
    // ── 1. 시스템 설정
    const [siteName, setSiteName] = useState('')
    const [mockBarText, setMockBarText] = useState('')
    // ── 2. 실습 설정
    const [aiFeedback, setAiFeedback] = useState(true)
    const [scoreReveal, setScoreReveal] = useState('immediate')
    const [submitLimit, setSubmitLimit] = useState('unlimited')
    // ── 3. 채점 기준
    const [weights, setWeights] = useState({ plaintiff: 10, defendant: 10, purpose: 25, reason: 35, evidence: 20 })
    // ── 4. 공지사항
    const [notices, setNotices] = useState<{ id: string; text: string; date: string }[]>([])
    const [newNotice, setNewNotice] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')
    // ── 5. 데이터 관리
    const [dataDeleteModal, setDataDeleteModal] = useState<{ type: 'all' | 'student'; sid?: string } | null>(null)
    const [selectedStudent, setSelectedStudent] = useState('')
    const [csvLoading, setCsvLoading] = useState(false)

    useEffect(() => {
      setSiteName(localStorage.getItem('site_name') || '')
      setMockBarText(localStorage.getItem('mock_bar_text') || '')
      setAiFeedback(localStorage.getItem('ai_feedback_enabled') !== 'false')
      setScoreReveal(localStorage.getItem('score_reveal') || 'immediate')
      setSubmitLimit(localStorage.getItem('submit_limit') || 'unlimited')
      try {
        const w = JSON.parse(localStorage.getItem('scoring_weights') || 'null')
        if (w && typeof w === 'object') setWeights(w)
      } catch { /* ignore */ }
      try {
        const n = JSON.parse(localStorage.getItem('notices') || 'null')
        if (Array.isArray(n)) setNotices(n)
      } catch { /* ignore */ }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const weightsTotal = Math.round((weights.plaintiff + weights.defendant + weights.purpose + weights.reason + weights.evidence) * 10) / 10

    function changeWeight(key: keyof typeof weights, val: number) {
      setWeights(prev => ({ ...prev, [key]: val }))
    }

    function saveSection1() {
      localStorage.setItem('site_name', siteName)
      localStorage.setItem('mock_bar_text', mockBarText)
      window.dispatchEvent(new CustomEvent('site-settings-updated'))
      showToast('시스템 설정이 저장되었습니다.')
    }

    function saveSection2() {
      localStorage.setItem('ai_feedback_enabled', String(aiFeedback))
      localStorage.setItem('score_reveal', scoreReveal)
      localStorage.setItem('submit_limit', submitLimit)
      showToast('실습 설정이 저장되었습니다.')
    }

    function saveSection3() {
      if (weightsTotal !== 100) { alert(`합계가 ${weightsTotal}점입니다. 합산이 100점이 되도록 조정해주세요.`); return }
      localStorage.setItem('scoring_weights', JSON.stringify(weights))
      showToast('채점 기준이 저장되었습니다.')
    }

    function persistNotices(updated: typeof notices) {
      localStorage.setItem('notices', JSON.stringify(updated))
      setNotices(updated)
    }

    function addNotice() {
      if (!newNotice.trim()) return
      persistNotices([{ id: String(Date.now()), text: newNotice.trim(), date: new Date().toISOString().slice(0, 10) }, ...notices])
      setNewNotice('')
      showToast('공지사항이 추가되었습니다.')
    }

    function deleteNotice(id: string) {
      persistNotices(notices.filter(n => n.id !== id))
      showToast('공지사항이 삭제되었습니다.')
    }

    function saveEditNotice() {
      if (!editText.trim() || !editingId) return
      persistNotices(notices.map(n => n.id === editingId ? { ...n, text: editText.trim() } : n))
      setEditingId(null)
      setEditText('')
      showToast('공지사항이 수정되었습니다.')
    }

    async function execDeleteRecords() {
      if (!dataDeleteModal) return
      let error
      if (dataDeleteModal.type === 'all') {
        ({ error } = await supabase.from('practice_records').delete().gte('id', 0))
      } else {
        ({ error } = await supabase.from('practice_records').delete().eq('student_id', dataDeleteModal.sid!))
      }
      if (error) { alert('삭제 실패: ' + error.message); return }
      const msg = dataDeleteModal.type === 'all' ? '전체 실습기록이 초기화되었습니다.' : '해당 학생의 기록이 삭제되었습니다.'
      setDataDeleteModal(null)
      setSelectedStudent('')
      showToast(msg)
    }

    async function exportCSV() {
      setCsvLoading(true)
      const { data, error } = await supabase.from('practice_records').select('*').order('created_at', { ascending: false })
      setCsvLoading(false)
      if (error || !data) { alert('내보내기 실패: ' + (error?.message || '')); return }
      const headers = ['id', 'student_id', 'score', 'case_type', 'court', 'plaintiff', 'defendant', 'feedback', 'created_at']
      const rows = data.map(r => headers.map(h => {
        const v = (r as Record<string, unknown>)[h] ?? ''
        return `"${String(v).replace(/"/g, '""')}"`
      }).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `practice_records_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('CSV 내보내기 완료.')
    }

    const sec: React.CSSProperties = { background: '#fff', border: '1px solid #d0d8e8', borderRadius: 10, padding: '24px', marginBottom: 20 }
    const secTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: '#1a3a6b', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid #e8edf5', display: 'flex', alignItems: 'center', gap: 8 }
    const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }
    const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
    const saveBtn: React.CSSProperties = { marginTop: 18, padding: '8px 28px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 20 }}>⚙ 설정</h2>

        {/* ── 1. 시스템 설정 */}
        <div style={sec}>
          <div style={secTitle}>🖥 시스템 설정</div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>실습 사이트 이름</label>
            <input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="전자소송 실습 시스템" style={inp} />
          </div>
          <div>
            <label style={lbl}>실습 안내 바 문구</label>
            <input value={mockBarText} onChange={e => setMockBarText(e.target.value)} placeholder="기본 안내 문구를 사용하려면 비워두세요" style={inp} />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>비워두면 기본 문구가 표시됩니다.</div>
          </div>
          <button onClick={saveSection1} style={saveBtn}>저장</button>
        </div>

        {/* ── 2. 실습 설정 */}
        <div style={sec}>
          <div style={secTitle}>🎓 실습 설정</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>AI 피드백</span>
            <button
              onClick={() => setAiFeedback(v => !v)}
              style={{ position: 'relative', width: 48, height: 26, borderRadius: 13, border: 'none', background: aiFeedback ? '#0067c2' : '#d1d5db', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: 3, left: aiFeedback ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', display: 'block' }} />
            </button>
            <span style={{ fontSize: 12, color: aiFeedback ? '#0067c2' : '#999', fontWeight: 700 }}>{aiFeedback ? 'ON' : 'OFF'}</span>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>점수 공개 시점</label>
            <div style={{ display: 'flex', gap: 24 }}>
              {[{ val: 'immediate', label: '제출 즉시' }, { val: 'after_review', label: '선생님 확인 후' }].map(o => (
                <label key={o.val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" checked={scoreReveal === o.val} onChange={() => setScoreReveal(o.val)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>소장 제출 제한</label>
            <div style={{ display: 'flex', gap: 24 }}>
              {[{ val: 'unlimited', label: '무제한' }, { val: '1', label: '1회' }, { val: '3', label: '3회' }].map(o => (
                <label key={o.val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" checked={submitLimit === o.val} onChange={() => setSubmitLimit(o.val)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <button onClick={saveSection2} style={saveBtn}>저장</button>
        </div>

        {/* ── 3. 채점 기준 */}
        <div style={sec}>
          <div style={secTitle}>
            📊 채점 기준
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: weightsTotal === 100 ? '#16a34a' : '#dc2626' }}>
              합계: {weightsTotal}점 {weightsTotal !== 100 && <span style={{ fontSize: 11, fontWeight: 400 }}>(100점이 되어야 합니다)</span>}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            {([
              { key: 'plaintiff', label: '원고' },
              { key: 'defendant', label: '피고' },
              { key: 'purpose', label: '청구취지' },
              { key: 'reason', label: '청구원인' },
              { key: 'evidence', label: '입증서류' },
            ] as const).map(({ key, label }) => (
              <div key={key} style={{ border: '1px solid #d0d8e8', borderRadius: 8, padding: '14px 16px', background: '#fafbfe' }}>
                <label style={{ ...lbl, marginBottom: 8, fontSize: 13 }}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={weights[key]}
                    onChange={e => changeWeight(key, parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #c8d8f0', borderRadius: 5, fontSize: 16, fontWeight: 700, color: '#1a3a6b', textAlign: 'right', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>점</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={saveSection3} style={{ ...saveBtn, marginTop: 0, opacity: weightsTotal !== 100 ? 0.5 : 1 }}>저장</button>
            <button onClick={() => setWeights({ plaintiff: 10, defendant: 10, purpose: 25, reason: 35, evidence: 20 })} style={{ marginTop: 0, padding: '8px 14px', background: '#f0f4fc', color: '#1a3a6b', border: '1px solid #c8d8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>기본값 복원</button>
          </div>
        </div>

        {/* ── 4. 공지사항 관리 */}
        <div style={sec}>
          <div style={secTitle}>📢 공지사항 관리</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input value={newNotice} onChange={e => setNewNotice(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNotice()} placeholder="새 공지사항 내용 입력..." style={{ ...inp, flex: 1 }} />
            <button onClick={addNotice} style={{ padding: '8px 18px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 추가</button>
          </div>
          {notices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#999', border: '1px dashed #d0d8e8', borderRadius: 6, fontSize: 13 }}>등록된 공지사항이 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notices.map(n => (
                <div key={n.id} style={{ border: '1px solid #e8edf5', borderRadius: 6, padding: '10px 14px', background: '#fafbfe' }}>
                  {editingId === n.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={editText} onChange={e => setEditText(e.target.value)} style={{ ...inp, flex: 1 }} autoFocus />
                      <button onClick={saveEditNotice} style={{ padding: '6px 14px', background: '#0067c2', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>저장</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>취소</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#333' }}>{n.text}</span>
                      <span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>{n.date}</span>
                      <button onClick={() => { setEditingId(n.id); setEditText(n.text) }} style={{ padding: '4px 10px', background: '#f0f4fc', border: '1px solid #c8d8f0', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#1a3a6b' }}>수정</button>
                      <button onClick={() => deleteNotice(n.id)} style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#dc2626' }}>삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 5. 데이터 관리 */}
        <div style={sec}>
          <div style={secTitle}>🗄 데이터 관리</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => setDataDeleteModal({ type: 'all' })}
              style={{ padding: '9px 18px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              🗑 전체 실습기록 초기화
            </button>
            <button
              onClick={exportCSV}
              disabled={csvLoading}
              style={{ padding: '9px 18px', background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: csvLoading ? 'not-allowed' : 'pointer', opacity: csvLoading ? 0.6 : 1 }}
            >
              {csvLoading ? '내보내는 중...' : '⬇ CSV 내보내기'}
            </button>
          </div>

          <div>
            <label style={lbl}>학생별 기록 초기화</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} style={{ ...inp, flex: 1 }}>
                <option value="">-- 학생 선택 --</option>
                {STUDENT_IDS.map(id => {
                  const acc = HARDCODED_ACCOUNTS[id]
                  return <option key={id} value={id}>{acc?.name} ({id})</option>
                })}
              </select>
              <button
                onClick={() => { if (selectedStudent) setDataDeleteModal({ type: 'student', sid: selectedStudent }) }}
                disabled={!selectedStudent}
                style={{ padding: '8px 18px', background: selectedStudent ? '#dc2626' : '#e5e7eb', color: selectedStudent ? '#fff' : '#999', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: selectedStudent ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
              >
                기록 삭제
              </button>
            </div>
          </div>
        </div>

        {/* 데이터 삭제 확인 모달 */}
        {dataDeleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 10, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,.25)', overflow: 'hidden' }}>
              <div style={{ background: '#dc2626', color: '#fff', padding: '14px 20px', fontWeight: 700, fontSize: 15 }}>⚠️ 실습기록 삭제</div>
              <div style={{ padding: '24px 20px', fontSize: 14, color: '#333', lineHeight: 1.8 }}>
                {dataDeleteModal.type === 'all'
                  ? '전체 실습기록을 초기화하시겠습니까?'
                  : `'${HARDCODED_ACCOUNTS[dataDeleteModal.sid!]?.name || dataDeleteModal.sid}' 학생의 실습기록을 삭제하시겠습니까?`}
                <br />
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>⚠️ 이 작업은 되돌릴 수 없습니다.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
                <button onClick={() => setDataDeleteModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: '#f5f5f5', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                <button onClick={execDeleteRecords} style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderPanel() {
    switch (activePanel) {
      case 'dashboard': return <DashboardPanel />
      case 'accounts': return <AccountsPanel />
      case 'cases': return <CasesPanel />
      case 'assign': return <AssignPanel />
      case 'records': return <RecordsPanel />
      case 'ecfs-cases': return <EcfsCasesPanel />
      case 'settings': return <SettingsPanel />
      default: return <DashboardPanel />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f7', display: 'flex', flexDirection: 'column' }}>
      <MockBar />

      {/* Admin header */}
      <div style={{ background: 'linear-gradient(90deg,#0d2244,#1a3a6b)', color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>⚖ {siteTitle}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{user.name} 관리자</span>
          <button
            onClick={() => { logout(); router.push('/') }}
            style={{ padding: '5px 14px', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left sidebar */}
        <aside style={{ width: 220, flexShrink: 0, background: '#0d2244', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
          {PANEL_ITEMS.map(item => (
            <div
              key={item.key}
              onClick={() => setActivePanel(item.key)}
              style={{
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: activePanel === item.key ? '#fff' : 'rgba(255,255,255,.6)',
                background: activePanel === item.key ? 'rgba(255,255,255,.12)' : 'transparent',
                borderLeft: activePanel === item.key ? '3px solid #b8922a' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>
              전자소송 실습 관리자<br />
              실습 전용 시스템
            </div>
          </div>
        </aside>

        {/* Content area */}
        <main style={{ flex: 1, padding: 28, overflowY: 'auto', minWidth: 0 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,.07)', minHeight: 500 }}>
            {renderPanel()}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
