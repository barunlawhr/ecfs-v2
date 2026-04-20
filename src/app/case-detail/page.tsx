"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useMemo } from "react";

// Seeded random number generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickMultiple<T>(arr: T[], count: number, rng: () => number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

const SURNAMES = [
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
  "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍",
  "전", "고", "문", "양", "손", "배", "백", "허", "유", "남",
];

const GIVEN_NAMES = [
  "민수", "지훈", "성호", "영수", "철수", "현우", "준호", "동현", "상민", "지수",
  "은정", "미영", "수진", "혜진", "정희", "영미", "소연", "하나", "지영", "유진",
  "태호", "병철", "기훈", "우진", "재민", "승현", "도윤", "시우", "예준", "하준",
];

const COMPANY_NAMES = [
  "주식회사 한국테크", "주식회사 미래건설", "삼성물산 주식회사", "주식회사 동방유통",
  "주식회사 대한전기", "신세계인터내셔날", "주식회사 한빛소프트", "주식회사 우리금융",
  "주식회사 태양에너지", "주식회사 서울유통", "주식회사 코리아트레이딩",
  "주식회사 남산건설", "주식회사 청운물산", "대한항공 주식회사", "주식회사 강남개발",
  "주식회사 하이테크", "주식회사 세종무역", "주식회사 광명산업", "롯데정보통신 주식회사",
];

const LAW_FIRMS = [
  "법무법인 태평양", "법무법인(유한) 바른", "법무법인 광장", "법무법인 세종",
  "법무법인 율촌", "법무법인 화우", "법무법인 지평", "법무법인 대륙",
  "법무법인 한결", "법무법인 민후", "법무법인 충정", "법무법인 동인",
  "법무법인 한누리", "법무법인 로고스",
];

const CASE_TYPES = [
  "대여금", "손해배상(기)", "매매대금", "부당이득금", "임금", "건물인도",
  "구상금", "약정금", "물품대금", "공사대금", "임대차보증금", "소유권이전등기",
  "가등기말소", "채무부존재확인", "위약금", "손해배상(자)", "퇴직금",
  "용역대금", "운송료", "보험금",
];

const COURTS = [
  "서울중앙지방법원", "서울남부지방법원", "서울동부지방법원", "서울서부지방법원",
  "서울북부지방법원", "수원지방법원", "인천지방법원", "대전지방법원",
  "대구지방법원", "부산지방법원", "광주지방법원", "의정부지방법원",
];

const DIVISIONS = [
  "민사11단독", "민사12단독", "민사13단독", "민사14단독", "민사15단독",
  "민사21단독", "민사22단독", "민사23단독", "민사24단독",
  "민사31단독", "민사32단독",
  "민사11단독(소액)", "민사12단독(소액)", "민사51부",
];

const CONCLUSION_TYPES = [
  "강제조정", "화해권고결정", "판결", "소취하", "조정성립", "화해",
  "청구인낙", "각하",
];

interface CaseData {
  court: string;
  caseNumber: string;
  caseName: string;
  plaintiff: string;
  defendant: string;
  division: string;
  receiptDate: string;
  conclusionResult: string;
  conclusionDate: string;
  plaintiffAmount: string;
  stampAmount: string;
  confirmDate: string;
  hearings: { date: string; time: string; type: string; location: string; result: string }[];
  submissions: { date: string; content: string }[];
  relatedCases: { court: string; caseNumber: string; type: string }[];
  plaintiffRep: string;
  defendantRep: string;
  plaintiffLawyer: string;
  defendantLawyer: string;
  progressEntries: { date: string; content: string; result: string; notice: string }[];
}

function generateCaseData(id: number): CaseData {
  const rng = seededRandom(id * 7919 + 12345);

  const court = pickRandom(COURTS, rng);
  const year = 2023 + Math.floor(rng() * 3);
  const caseNum = 10000 + Math.floor(rng() * 90000);
  const gaType = rng() > 0.7 ? "가소" : rng() > 0.4 ? "가단" : "가합";
  const caseNumber = `${year}${gaType}${caseNum}`;

  const caseName = pickRandom(CASE_TYPES, rng);

  const isCompanyPlaintiff = rng() > 0.5;
  const isCompanyDefendant = rng() > 0.4;

  const plaintiffSurname = pickRandom(SURNAMES, rng);
  const plaintiffGiven = pickRandom(GIVEN_NAMES, rng);
  const plaintiff = isCompanyPlaintiff
    ? pickRandom(COMPANY_NAMES, rng)
    : `${plaintiffSurname}${plaintiffGiven}`;

  const defendantSurname = pickRandom(SURNAMES, rng);
  const defendantGiven = pickRandom(GIVEN_NAMES, rng);
  const defendant = isCompanyDefendant
    ? pickRandom(COMPANY_NAMES, rng)
    : `${defendantSurname}${defendantGiven}`;

  const division = pickRandom(DIVISIONS, rng);

  const receiptMonth = 1 + Math.floor(rng() * 12);
  const receiptDay = 1 + Math.floor(rng() * 28);
  const receiptDate = `${year}.${String(receiptMonth).padStart(2, "0")}.${String(receiptDay).padStart(2, "0")}`;

  const conclusionType = pickRandom(CONCLUSION_TYPES, rng);
  const concMonth = receiptMonth + 3 + Math.floor(rng() * 9);
  const concYear = year + Math.floor((concMonth - 1) / 12);
  const concMonthAdj = ((concMonth - 1) % 12) + 1;
  const concDay = 1 + Math.floor(rng() * 28);
  const conclusionDate = `${concYear}.${String(concMonthAdj).padStart(2, "0")}.${String(concDay).padStart(2, "0")}`;

  const confirmMonth = concMonthAdj + 1 + Math.floor(rng() * 2);
  const confirmYear = concYear + Math.floor((confirmMonth - 1) / 12);
  const confirmMonthAdj = ((confirmMonth - 1) % 12) + 1;
  const confirmDay = 1 + Math.floor(rng() * 28);
  const confirmDate = `${confirmYear}.${String(confirmMonthAdj).padStart(2, "0")}.${String(confirmDay).padStart(2, "0")}`;

  const amount = (1 + Math.floor(rng() * 500)) * 100000;
  const plaintiffAmount = amount.toLocaleString();
  const stampRate = rng() > 0.5 ? 0.005 : 0.01;
  const stampAmount = Math.floor(amount * stampRate).toLocaleString();

  // Lawyers
  const pLawyerSurname = pickRandom(SURNAMES, rng);
  const pLawyerGiven = pickRandom(GIVEN_NAMES, rng);
  const plaintiffLawyer = `${pLawyerSurname}${pLawyerGiven}`;
  const dLawyerSurname = pickRandom(SURNAMES, rng);
  const dLawyerGiven = pickRandom(GIVEN_NAMES, rng);
  const defendantLawyer = `${dLawyerSurname}${dLawyerGiven}`;

  const plaintiffRep = plaintiff;
  const defendantRep = defendant;

  // Hearings
  const numHearings = 2 + Math.floor(rng() * 3);
  const hearings: CaseData["hearings"] = [];
  for (let i = 0; i < numHearings; i++) {
    const hMonth = receiptMonth + 2 + Math.floor(rng() * 8);
    const hYear = year + Math.floor((hMonth - 1) / 12);
    const hMonthAdj = ((hMonth - 1) % 12) + 1;
    const hDay = 1 + Math.floor(rng() * 28);
    const hHour = 9 + Math.floor(rng() * 6);
    const hMin = Math.floor(rng() * 4) * 15;
    const building = 1 + Math.floor(rng() * 3);
    const floor = 2 + Math.floor(rng() * 4);
    const room = floor * 100 + 1 + Math.floor(rng() * 10);
    const results = ["기일변경", "속행", "판결선고", "변론종결", "조정성립"];
    hearings.push({
      date: `${hYear}.${String(hMonthAdj).padStart(2, "0")}.${String(hDay).padStart(2, "0")}`,
      time: `${String(hHour).padStart(2, "0")}:${String(hMin).padStart(2, "0")}`,
      type: "변론",
      location: `제${building}별관 ${floor}층 ${room}호법정`,
      result: pickRandom(results, rng),
    });
  }

  // Submissions
  const numSubmissions = 4 + Math.floor(rng() * 4);
  const submissions: CaseData["submissions"] = [];
  const submissionTypes = [
    `피고 소송대리인 ${defendantLawyer} 답변서(청구취지/원인) 제출`,
    `원고 소송대리인 ${plaintiffLawyer} 준비서면 제출`,
    `피고 소송대리인 ${defendantLawyer} 준비서면 제출`,
    `원고 소송대리인 ${plaintiffLawyer} 증거신청서 제출`,
    `피고 소송대리인 ${defendantLawyer} 증거신청서 제출`,
    `원고 소송대리인 ${plaintiffLawyer} 사실조회 촉탁신청서 제출`,
    `원고 소송대리인 ${plaintiffLawyer} 석명준비서면 제출`,
    `피고 소송대리인 ${defendantLawyer} 참고서면 제출`,
  ];
  for (let i = 0; i < numSubmissions; i++) {
    const sMonth = receiptMonth + 1 + Math.floor(rng() * 10);
    const sYear = year + Math.floor((sMonth - 1) / 12);
    const sMonthAdj = ((sMonth - 1) % 12) + 1;
    const sDay = 1 + Math.floor(rng() * 28);
    submissions.push({
      date: `${sYear}.${String(sMonthAdj).padStart(2, "0")}.${String(sDay).padStart(2, "0")}`,
      content: pickRandom(submissionTypes, rng),
    });
  }

  // Related cases
  const hasRelated = rng() > 0.6;
  const relatedCases: CaseData["relatedCases"] = [];
  if (hasRelated) {
    relatedCases.push({
      court,
      caseNumber: `${year}머${10000 + Math.floor(rng() * 90000)}`,
      type: "조정사건",
    });
  }

  // Progress entries
  const numProgress = 15 + Math.floor(rng() * 16);
  const progressEntries: CaseData["progressEntries"] = [];

  // Always start with 소장접수
  progressEntries.push({ date: receiptDate, content: "소장접수", result: "", notice: "" });
  progressEntries.push({
    date: receiptDate,
    content: `원고 소송대리인 ${plaintiffLawyer} 소송위임장 제출`,
    result: "",
    notice: "",
  });

  const progressTemplates = [
    { content: `원고 소송대리인 ${plaintiffLawyer} 사실조회 촉탁신청서 제출`, result: "", notice: "" },
    { content: "참여관용 보정명령", result: "", notice: "" },
    { content: `${pickRandom(COMPANY_NAMES, rng)}에게 사법보좌관용 사실조회서 송달`, result: "위의 '확인' 항목 체크", notice: "" },
    { content: `피고에게 소장부본 등 송달`, result: "송달완료", notice: "" },
    { content: `피고 소송대리인 ${defendantLawyer} 소송위임장 제출`, result: "", notice: "" },
    { content: `피고 소송대리인 ${defendantLawyer} 답변서(청구취지/원인) 제출`, result: "", notice: "" },
    { content: "기일지정명령", result: "", notice: "" },
    { content: "기일변경명령", result: "", notice: "" },
    { content: `원고 소송대리인 ${plaintiffLawyer} 준비서면 제출`, result: "", notice: "" },
    { content: `피고 소송대리인 ${defendantLawyer} 준비서면 제출`, result: "", notice: "" },
    { content: `원고에게 기일통지서 송달`, result: "송달완료", notice: "" },
    { content: `피고에게 기일통지서 송달`, result: "송달완료", notice: "" },
    { content: `원고 소송대리인 ${plaintiffLawyer} 증거신청서 제출`, result: "", notice: "" },
    { content: `피고 소송대리인 ${defendantLawyer} 증거신청서 제출`, result: "", notice: "" },
    { content: `원고 소송대리인 ${plaintiffLawyer} 석명준비서면 제출`, result: "", notice: "" },
    { content: `피고 소송대리인 ${defendantLawyer} 참고서면 제출`, result: "", notice: "" },
    { content: `원고에게 판결정본 송달`, result: "송달완료", notice: "" },
    { content: `피고에게 판결정본 송달`, result: "송달완료", notice: "" },
  ];

  // Add hearing entries
  for (const h of hearings) {
    progressTemplates.push({
      content: `변론기일(${h.location} ${h.time})`,
      result: h.result,
      notice: "",
    });
  }

  const selected = pickMultiple(progressTemplates, Math.min(numProgress - 2, progressTemplates.length), rng);

  for (let i = 0; i < selected.length; i++) {
    const pMonth = receiptMonth + Math.floor((i + 1) * 10 / selected.length);
    const pYear = year + Math.floor((pMonth - 1) / 12);
    const pMonthAdj = ((pMonth - 1) % 12) + 1;
    const pDay = 1 + Math.floor(rng() * 28);
    progressEntries.push({
      date: `${pYear}.${String(pMonthAdj).padStart(2, "0")}.${String(pDay).padStart(2, "0")}`,
      ...selected[i],
    });
  }

  // Add conclusion
  progressEntries.push({
    date: conclusionDate,
    content: `종국: ${conclusionType}`,
    result: conclusionType,
    notice: "",
  });

  return {
    court,
    caseNumber,
    caseName,
    plaintiff,
    defendant,
    division,
    receiptDate,
    conclusionResult: conclusionType,
    conclusionDate,
    confirmDate,
    plaintiffAmount,
    stampAmount,
    hearings,
    submissions,
    relatedCases,
    plaintiffRep,
    defendantRep,
    plaintiffLawyer,
    defendantLawyer,
    progressEntries,
  };
}

function CaseDetailContent() {
  const searchParams = useSearchParams();
  const id = parseInt(searchParams.get("id") || "1", 10);
  const [activeTab, setActiveTab] = useState<"general" | "progress">("general");

  const caseData = useMemo(() => generateCaseData(id), [id]);

  const styles = {
    page: {
      fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif",
      fontSize: "12px",
      color: "#333",
      minHeight: "100vh",
      backgroundColor: "#fff",
    } as React.CSSProperties,
    header: {
      background: "linear-gradient(to bottom, #5a3e1b, #3d2a10)",
      color: "#fff",
      padding: "12px 20px",
    } as React.CSSProperties,
    headerTitle: {
      fontSize: "16px",
      fontWeight: "bold",
      marginBottom: "6px",
    } as React.CSSProperties,
    headerNotice: {
      fontSize: "11px",
      color: "#e8d5a3",
      lineHeight: "1.6",
    } as React.CSSProperties,
    tabContainer: {
      display: "flex",
      borderBottom: "2px solid #4a3520",
      margin: "0 15px",
    } as React.CSSProperties,
    tab: (active: boolean) => ({
      padding: "8px 20px",
      cursor: "pointer",
      backgroundColor: active ? "#4a3520" : "#e8e0d4",
      color: active ? "#fff" : "#333",
      border: "1px solid #4a3520",
      borderBottom: active ? "none" : "1px solid #4a3520",
      fontWeight: active ? "bold" : "normal",
      fontSize: "12px",
      borderRadius: "4px 4px 0 0",
      marginRight: "2px",
    }) as React.CSSProperties,
    content: {
      padding: "15px 20px",
    } as React.CSSProperties,
    sectionHeader: {
      fontSize: "13px",
      fontWeight: "bold",
      color: "#333",
      padding: "8px 0",
      borderBottom: "2px solid #4a3520",
      marginTop: "15px",
      marginBottom: "0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    } as React.CSSProperties,
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      border: "1px solid #ddd",
      fontSize: "11px",
    } as React.CSSProperties,
    th: {
      backgroundColor: "#f5f1eb",
      padding: "5px 8px",
      border: "1px solid #ddd",
      fontWeight: "bold",
      textAlign: "center" as const,
      whiteSpace: "nowrap" as const,
    } as React.CSSProperties,
    td: {
      padding: "5px 8px",
      border: "1px solid #ddd",
      textAlign: "left" as const,
    } as React.CSSProperties,
    labelCell: {
      backgroundColor: "#f5f1eb",
      padding: "5px 8px",
      border: "1px solid #ddd",
      fontWeight: "bold",
      textAlign: "center" as const,
      width: "100px",
      whiteSpace: "nowrap" as const,
    } as React.CSSProperties,
    valueCell: {
      padding: "5px 8px",
      border: "1px solid #ddd",
    } as React.CSSProperties,
    btn: {
      padding: "3px 10px",
      fontSize: "11px",
      border: "1px solid #999",
      borderRadius: "3px",
      backgroundColor: "#f5f5f5",
      cursor: "pointer",
      marginLeft: "5px",
    } as React.CSSProperties,
    noticeBox: {
      backgroundColor: "#fdf8ec",
      border: "1px solid #e8d5a3",
      padding: "8px 12px",
      fontSize: "11px",
      color: "#6b4c00",
      lineHeight: "1.8",
      margin: "10px 0",
    } as React.CSSProperties,
    footnote: {
      fontSize: "11px",
      color: "#c00",
      padding: "5px 0",
    } as React.CSSProperties,
    oliveText: {
      color: "#8B6914",
      fontWeight: "bold" as const,
    } as React.CSSProperties,
    topBtn: {
      display: "flex",
      justifyContent: "flex-end",
      padding: "15px 0",
    } as React.CSSProperties,
  };

  const renderGeneralTab = () => (
    <div style={styles.content}>
      {/* 기본내용 */}
      <div style={styles.sectionHeader}>
        <span>○ 기본내용 ({caseData.court})</span>
        <span>
          <button style={styles.btn}>📋</button>
          <button style={styles.btn}>청사배치</button>
        </span>
      </div>
      <table style={styles.table}>
        <tbody>
          <tr>
            <td style={styles.labelCell}>사건번호</td>
            <td style={styles.valueCell}>{caseData.caseNumber}</td>
            <td style={styles.labelCell}>사건명</td>
            <td style={styles.valueCell}>{caseData.caseName}</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>원고</td>
            <td style={styles.valueCell}>{caseData.plaintiff}</td>
            <td style={styles.labelCell}>피고</td>
            <td style={styles.valueCell}>{caseData.defendant}</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>재판부</td>
            <td style={styles.valueCell} colSpan={3}>{caseData.division}</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>접수일</td>
            <td style={styles.valueCell}>{caseData.receiptDate}</td>
            <td style={styles.labelCell}>종국결과</td>
            <td style={styles.valueCell}>{caseData.conclusionDate} {caseData.conclusionResult}</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>원고소가</td>
            <td style={styles.valueCell}>{caseData.plaintiffAmount}원</td>
            <td style={styles.labelCell}>피고소가</td>
            <td style={styles.valueCell}>0원</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>수리구분</td>
            <td style={styles.valueCell}>제소</td>
            <td style={styles.labelCell}>병합구분</td>
            <td style={styles.valueCell}>없음</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>상소인</td>
            <td style={styles.valueCell}></td>
            <td style={styles.labelCell}>상소일</td>
            <td style={styles.valueCell}></td>
          </tr>
          <tr>
            <td style={styles.labelCell}>상소각하일</td>
            <td style={styles.valueCell}></td>
            <td style={styles.labelCell}>보존여부</td>
            <td style={styles.valueCell}>기록보존됨</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>인지액</td>
            <td style={styles.valueCell} colSpan={3}>{caseData.stampAmount}원</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>송달료,보관금,종결에<br/>따른 잔액조회</td>
            <td style={styles.valueCell} colSpan={3}>
              <button style={styles.btn}>잔액조회</button>
            </td>
          </tr>
          <tr>
            <td style={styles.labelCell}>판결도달일</td>
            <td style={styles.valueCell}></td>
            <td style={styles.labelCell}>확정일</td>
            <td style={styles.valueCell}>{caseData.confirmDate}</td>
          </tr>
        </tbody>
      </table>

      {/* 최근기일내용 */}
      <div style={styles.sectionHeader}>
        <span>○ 최근기일내용</span>
        <button style={styles.btn}>상세보기</button>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>일자</th>
            <th style={styles.th}>시각</th>
            <th style={styles.th}>기일구분</th>
            <th style={styles.th}>기일장소</th>
            <th style={styles.th}>결과</th>
          </tr>
        </thead>
        <tbody>
          {caseData.hearings.map((h, i) => (
            <tr key={i}>
              <td style={{ ...styles.td, textAlign: "center", fontWeight: "bold" }}>{h.date}</td>
              <td style={{ ...styles.td, textAlign: "center" }}>{h.time}</td>
              <td style={{ ...styles.td, textAlign: "center" }}>{h.type}</td>
              <td style={{ ...styles.td, textAlign: "center" }}>{h.location}</td>
              <td style={{ ...styles.td, textAlign: "center", ...styles.oliveText }}>{h.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={styles.footnote}>※ 최근 기일 순으로 일부만 보입니다. 반드시 상세보기로 확인하시기 바랍니다.</p>

      {/* 최근 제출서류 접수내용 */}
      <div style={styles.sectionHeader}>
        <span>○ 최근 제출서류 접수내용</span>
        <button style={styles.btn}>상세보기</button>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>일자</th>
            <th style={styles.th}>내용</th>
          </tr>
        </thead>
        <tbody>
          {caseData.submissions.map((s, i) => (
            <tr key={i}>
              <td style={{ ...styles.td, textAlign: "center", fontWeight: "bold", whiteSpace: "nowrap" }}>{s.date}</td>
              <td style={styles.td}>{s.content}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={styles.footnote}>※ 최근 제출서류 순으로 일부만 보입니다. 반드시 상세보기로 확인하시기 바랍니다.</p>

      {/* 관련사건내용 */}
      <div style={styles.sectionHeader}>
        <span>○ 관련사건내용</span>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>법원</th>
            <th style={styles.th}>사건번호</th>
            <th style={styles.th}>구분</th>
          </tr>
        </thead>
        <tbody>
          {caseData.relatedCases.length > 0 ? (
            caseData.relatedCases.map((r, i) => (
              <tr key={i}>
                <td style={{ ...styles.td, textAlign: "center" }}>{r.court}</td>
                <td style={{ ...styles.td, textAlign: "center" }}>{r.caseNumber}</td>
                <td style={{ ...styles.td, textAlign: "center" }}>{r.type}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td style={{ ...styles.td, textAlign: "center" }} colSpan={3}>관련사건이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 당사자내용 */}
      <div style={styles.sectionHeader}>
        <span>○ 당사자내용</span>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>구분</th>
            <th style={styles.th}>이름</th>
            <th style={styles.th}>종국결과</th>
            <th style={styles.th}>판결도달일</th>
            <th style={styles.th}>확정일</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...styles.td, textAlign: "center" }}>원고</td>
            <td style={styles.td}>{caseData.plaintiffRep}</td>
            <td style={{ ...styles.td, textAlign: "center" }}>{caseData.conclusionResult}</td>
            <td style={{ ...styles.td, textAlign: "center" }}></td>
            <td style={{ ...styles.td, textAlign: "center" }}>{caseData.confirmDate}</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, textAlign: "center" }}>피고</td>
            <td style={styles.td}>{caseData.defendantRep}</td>
            <td style={{ ...styles.td, textAlign: "center" }}>{caseData.conclusionResult}</td>
            <td style={{ ...styles.td, textAlign: "center" }}></td>
            <td style={{ ...styles.td, textAlign: "center" }}>{caseData.confirmDate}</td>
          </tr>
        </tbody>
      </table>

      {/* 대리인내용 */}
      <div style={styles.sectionHeader}>
        <span>○ 대리인내용</span>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>구분</th>
            <th style={styles.th}>이름</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...styles.td, textAlign: "center" }}>원고 소송대리인</td>
            <td style={styles.td}>변호사 {caseData.plaintiffLawyer}</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, textAlign: "center" }}>피고 소송대리인</td>
            <td style={styles.td}>변호사 {caseData.defendantLawyer}</td>
          </tr>
        </tbody>
      </table>

      <div style={styles.topBtn}>
        <button style={styles.btn} onClick={() => window.scrollTo(0, 0)}>맨위로</button>
      </div>
    </div>
  );

  const renderProgressTab = () => (
    <div style={styles.content}>
      {/* 기본내용 abbreviated */}
      <div style={styles.sectionHeader}>
        <span>○ 기본내용 ({caseData.court})</span>
      </div>
      <table style={styles.table}>
        <tbody>
          <tr>
            <td style={styles.labelCell}>사건번호</td>
            <td style={styles.valueCell}>{caseData.caseNumber}</td>
            <td style={styles.labelCell}>사건명</td>
            <td style={styles.valueCell}>{caseData.caseName}</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>원고</td>
            <td style={styles.valueCell}>{caseData.plaintiff}</td>
            <td style={styles.labelCell}>피고</td>
            <td style={styles.valueCell}>{caseData.defendant}</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>재판부</td>
            <td style={styles.valueCell} colSpan={3}>{caseData.division}</td>
          </tr>
          <tr>
            <td style={styles.labelCell}>접수일</td>
            <td style={styles.valueCell}>{caseData.receiptDate}</td>
            <td style={styles.labelCell}>종국결과</td>
            <td style={styles.valueCell}>{caseData.conclusionDate} {caseData.conclusionResult}</td>
          </tr>
        </tbody>
      </table>

      {/* 진행내용 */}
      <div style={styles.sectionHeader}>
        <span>○ 진행내용</span>
        <span>
          <span style={{ marginRight: "5px", fontSize: "11px" }}>진행구분</span>
          <select style={{ fontSize: "11px", padding: "2px 5px", border: "1px solid #999" }}>
            <option>전체</option>
          </select>
        </span>
      </div>

      <div style={styles.noticeBox}>
        <p style={{ margin: "0 0 4px 0" }}>• 송달결과는 법적인 효력이 없는 참고사항에 불과하고, 추후 송달이 착오에 말미암은 것이거나 부적법한 경우 변경될 수 있습니다.</p>
        <p style={{ margin: "0 0 4px 0" }}>• 송달결과는 &apos;0시 도달&apos;로 나타나는 경우에는 기간 계산 시 초일이 산입된다는 점에 유의하시기 바랍니다.</p>
        <p style={{ margin: "0" }}>• 우정사업본부(우체국)에서 수취인에게 등기우편물을 배달하고, 그 배달결과를 법원에 통보한 이후에 송달결과가 표시됩니다.</p>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>일자</th>
            <th style={styles.th}>내용</th>
            <th style={styles.th}>결과</th>
            <th style={styles.th}>공시문</th>
          </tr>
        </thead>
        <tbody>
          {caseData.progressEntries.map((p, i) => (
            <tr key={i}>
              <td style={{
                ...styles.td,
                textAlign: "center",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                color: p.result === "송달완료" ? "#8B6914" : "#000",
              }}>
                {p.date}
              </td>
              <td style={styles.td}>{p.content}</td>
              <td style={{
                ...styles.td,
                textAlign: "center",
                color: "#8B6914",
                fontWeight: (p.result === "기일변경" || p.result === "속행") ? "bold" : "normal",
              }}>
                {p.result}
              </td>
              <td style={{ ...styles.td, textAlign: "center" }}>{p.notice}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...styles.noticeBox, marginTop: "15px" }}>
        <p style={{ margin: "0 0 4px 0" }}>• 송달내용은 법원에서 해당 당사자(대리인)에게 해당 내용의 송달물을 발송한 내용입니다.</p>
        <p style={{ margin: "0" }}>• 송달간주(발송송달)는 민사소송법 제189조에 의하여 법원사무관등이 발송한 때에 송달된 것으로 봅니다.</p>
      </div>

      <div style={styles.topBtn}>
        <button style={styles.btn} onClick={() => window.scrollTo(0, 0)}>맨위로</button>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>⚖ 대법원 전자소송</div>
        <div style={styles.headerNotice}>
          • 본 사이트에서 제공된 사건정보는 법적인 효력이 없으니, 참고자료로만 활용하시기 바랍니다.<br />
          • 민사, 특허 등 전자소송으로 진행되는 사건에 대해서는 대한민국법원 전자소송포털을 이용하시면 판결문이나 사건기록을 모두 인터넷으로 보실 수 있습니다.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "15px 15px 0 15px" }}>
        <div style={styles.tabContainer}>
          <div
            style={styles.tab(activeTab === "general")}
            onClick={() => setActiveTab("general")}
          >
            {activeTab === "general" && "✓ "}일반내용
          </div>
          <div
            style={styles.tab(activeTab === "progress")}
            onClick={() => setActiveTab("progress")}
          >
            {activeTab === "progress" && "✓ "}진행내용
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === "general" ? renderGeneralTab() : renderProgressTab()}
    </div>
  );
}

export default function CaseDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: "20px", fontFamily: "'Malgun Gothic', sans-serif" }}>로딩중...</div>}>
      <CaseDetailContent />
    </Suspense>
  );
}
