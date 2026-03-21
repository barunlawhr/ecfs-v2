'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth()
  const router = useRouter()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  async function handleLogin() {
    setErr('')
    if (!id || !pw) { setErr('아이디와 비밀번호를 입력해주세요.'); return }
    setLoggingIn(true)
    const user = await login(id, pw)
    setLoggingIn(false)
    if (!user) { setErr('아이디 또는 비밀번호가 올바르지 않습니다.'); return }
    onClose()
    if (user.role === 'admin') router.push('/admin')
    else router.push('/mypage')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 6, width: 420, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,.25)' }}>
        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#003366,#006699)', color: '#fff', padding: '22px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>⚖ 전자소송 실습 시스템</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>실습 계정으로 로그인하여 소장 작성을 시작하세요</div>
        </div>
        {/* 바디 */}
        <div style={{ padding: '22px 24px 16px' }}>
          <div style={{ background: '#f0f7ff', border: '1px solid #b3d9f0', borderRadius: 3, padding: '10px 12px', fontSize: 11, color: '#1a4a6b', lineHeight: 1.8, marginBottom: 14 }}>
            📋 담당 선생님께 부여받은 <strong>아이디</strong>와 <strong>비밀번호</strong>로 로그인하세요.
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }}>아이디</label>
            <input className="inp" style={{ width: '100%' }} value={id} onChange={e => setId(e.target.value)} placeholder="아이디 입력" onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} disabled={loggingIn} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }}>비밀번호</label>
            <input className="inp" type="password" style={{ width: '100%' }} value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호 입력" onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} disabled={loggingIn} />
          </div>
          {err && <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 8 }}>{err}</div>}
          <button onClick={handleLogin} disabled={loggingIn} style={{ width: '100%', height: 44, background: loggingIn ? '#7ab0c8' : '#006699', color: '#fff', border: 'none', borderRadius: 3, fontSize: 14, fontWeight: 700, cursor: loggingIn ? 'not-allowed' : 'pointer', marginTop: 8, marginBottom: 8, fontFamily: 'inherit' }}>
            {loggingIn ? '로그인 중...' : '로그인'}
          </button>
          <button onClick={onClose} style={{ width: '100%', height: 36, background: '#fff', color: '#555', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            취소
          </button>
        </div>
        <div style={{ background: '#f7f9fc', borderTop: '1px solid #eaecf0', padding: '10px 24px', display: 'flex', justifyContent: 'center', gap: 0 }}>
          {['이용약관', '개인정보처리방침', '고객센터'].map(l => (
            <span key={l} style={{ fontSize: 12, color: '#777', cursor: 'pointer', padding: '0 12px', borderRight: '1px solid #dde0e6' }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
