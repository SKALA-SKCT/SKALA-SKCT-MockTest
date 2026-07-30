"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const guideSections = [
  {
    eyebrow: "Start",
    title: "1회차부터 순서대로 응시",
    body: "처음 접속하면 우측 모의고사 목록에서 1회차만 응시할 수 있습니다. 한 회차를 완료해야 다음 회차가 열립니다.",
    image: "/help/empty-dashboard.png",
    alt: "첫 모의고사 응시 전 대시보드",
  },
  {
    eyebrow: "Exam Info",
    title: "시험 구성 확인 후 시작",
    body: "응시 버튼을 누르면 유형 수, 총 시간, 유형별 문항 수와 시간을 확인할 수 있습니다. 완료 후에는 결과 페이지에서 같은 회차를 다시 응시할 수 있습니다.",
    image: "/help/exam-intro.png",
    alt: "모의고사 시작 전 안내 모달",
  },
  {
    eyebrow: "Section",
    title: "유형별로 문제 풀이",
    body: "각 유형은 20문항, 15분으로 진행됩니다. 유형 안에서는 문항 번호를 눌러 자유롭게 이동할 수 있습니다.",
    image: "/help/section-start.png",
    alt: "유형 시작 전 안내 화면",
  },
  {
    eyebrow: "Solving",
    title: "메모장, 그림판, 계산기와 함께 풀이",
    body: "풀이 화면에서는 메모장과 그림판을 사용할 수 있고, 수열추리 등 계산이 필요한 유형에서는 계산기도 함께 제공합니다.",
    image: "/help/exam-taking.png",
    alt: "모의고사 문제 풀이 화면",
  },
  {
    eyebrow: "Submit",
    title: "미응답이 있어도 유형 제출 가능",
    body: "다음 유형으로 넘어갈 때 미응답 문항 수를 확인한 뒤 제출할 수 있습니다. 제출한 유형은 다시 풀 수 없습니다.",
    image: "/help/submit-confirm.png",
    alt: "유형 제출 확인 모달",
  },
  {
    eyebrow: "Exit",
    title: "응시 중단 시 기록 초기화",
    body: "응시 도중 나가기를 선택하면 이번 응시 기록과 저장된 답안이 모두 초기화됩니다.",
    image: "/help/exit-confirm.png",
    alt: "응시 중단 확인 모달",
  },
  {
    eyebrow: "Dashboard",
    title: "완료 후 누적 분석 확인",
    body: "완료한 회차의 점수 추이와 유형별 누적 점수를 전체, 캠퍼스, 분반 평균과 비교합니다.",
    image: "/help/dashboard.png",
    alt: "모의고사 목록과 점수 추이 대시보드",
  },
  {
    eyebrow: "Result",
    title: "전체 시험자 점수 분포 확인",
    body: "응시 완료 후 내 점수대, 전체 평균, 최고점을 한 화면에서 확인해 현재 위치를 빠르게 파악할 수 있습니다.",
    image: "/help/result-distribution.png",
    alt: "전체 시험자 점수 분포 결과 화면",
  },
  {
    eyebrow: "Compare",
    title: "과목별 점수와 랭킹 비교",
    body: "과목별 점수, 평균 대비 차이, 랭킹을 함께 보며 강점과 약한 유형을 구분합니다.",
    image: "/help/result-detail.png",
    alt: "과목별 점수 비교와 랭킹 화면",
  },
  {
    eyebrow: "Weak Points",
    title: "유형별 고오답률 문항 분석",
    body: "내 응시를 포함한 전체 응시자 기준으로 많이 틀린 문항을 모아, 복습 우선순위를 정할 수 있습니다.",
    image: "/help/hard-questions.png",
    alt: "유형별 고오답률 문항 목록",
  },
  {
    eyebrow: "Review",
    title: "문항별 리뷰와 해설 확인",
    body: "문제 원문, 자료, 보기, 정답, 내 답, 해설을 한 번에 확인하며 틀린 문제와 맞춘 문제를 필터링할 수 있습니다.",
    image: "/help/review.png",
    alt: "문항별 리뷰와 해설 화면",
  },
];

const guideSummary = [
  {
    title: "실전처럼 응시",
    body: "5개 유형을 제한 시간 안에 풀고, 회차는 1회차부터 순서대로 진행합니다.",
  },
  {
    title: "평균과 비교",
    body: "내 점수와 등수를 전체, 캠퍼스, 분반 평균 기준으로 비교합니다.",
  },
  {
    title: "취약 문항 복습",
    body: "고오답률 문항과 문항별 해설을 확인해 복습 우선순위를 잡습니다.",
  },
];

export default function HelpGuideButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const modal =
    typeof document !== "undefined" && open
      ? createPortal(
          <div
            role="presentation"
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-zinc-950/45 px-6 py-8 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-guide-title"
              className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-5 px-9 pb-5 pt-7">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">
                    Guide
                  </p>
                  <h2
                    id="help-guide-title"
                    className="mt-2 text-2xl font-black tracking-tight text-ink"
                  >
                    SKCT 모의고사 이용 가이드
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-3">
                    SKALA 교육생을 위한 SKCT 모의고사 응시, 결과 비교,
                    문항별 복습 서비스입니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-white text-lg font-semibold text-ink-3 transition hover:bg-page hover:text-ink"
                  aria-label="가이드 닫기"
                >
                  x
                </button>
              </div>

              <div className="overflow-y-auto px-9 pb-8 pt-4">
                <div className="mx-auto grid max-w-5xl gap-8">
                  <div className="grid gap-3 md:grid-cols-3">
                    {guideSummary.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-hairline bg-page px-4 py-3"
                      >
                        <p className="text-sm font-black text-ink">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-ink-3">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                  {guideSections.map((section, index) => (
                    <article
                      key={section.title}
                      className="grid gap-8 border-b border-hairline pb-8 last:border-b-0 last:pb-0 lg:grid-cols-[260px_minmax(0,1fr)]"
                    >
                      <div className="flex gap-4 lg:block">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm font-black text-brand lg:mb-4">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand">
                            {section.eyebrow}
                          </p>
                          <h3 className="mt-2 text-lg font-black text-ink">
                            {section.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-ink-3">
                            {section.body}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-hairline bg-page">
                        <Image
                          src={section.image}
                          alt={section.alt}
                          width={1500}
                          height={820}
                          className="h-auto w-full"
                          sizes="(min-width: 1024px) 760px, 100vw"
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-sm font-bold text-ink transition hover:bg-black/[0.04] hover:text-brand"
        aria-label="서비스 가이드 열기"
        title="서비스 가이드"
      >
        ?
      </button>
      {modal}
    </>
  );
}
