export default function Footer() {
  return (
    <footer style={{ background: '#2c3e50', borderTop: '3px solid #b8922a', marginTop: 40 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 20px', display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        {['이용약관', '개인정보처리방침', '저작권보호정책', '링크시유의사항', '문제해결안내', '고객의소리', '사이트맵'].map(l => (
          <span key={l} style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', padding: '0 12px', borderRight: '1px solid rgba(255,255,255,.15)', cursor: 'pointer' }}>{l}</span>
        ))}
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 20px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>이용 및 장애 문의 02) 3480-1715 (평일 9시~18시)</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>COPYRIGHT © 대한민국 법원 전자소송포털. ALL RIGHTS RESERVED.</span>
      </div>
    </footer>
  )
}
