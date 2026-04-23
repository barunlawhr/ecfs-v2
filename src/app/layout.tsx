import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import QuickSidebar from '@/components/layout/QuickSidebar'

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '[바른커리어] 전자소송모의실습사이트',
  description: '바른커리어 법률사무원 전자소송 실습 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className}>
        <AuthProvider>
          {children}
          <QuickSidebar />
        </AuthProvider>
      </body>
    </html>
  )
}
