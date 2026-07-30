"use client";

export default function HeaderServiceNav({
  motherUrl,
  practiceUrl,
}: {
  motherUrl: string;
  practiceUrl: string;
}) {
  return (
    <div className="flex items-center gap-[34px] text-[16px] font-normal leading-[1.7]">
      <a href={motherUrl} className="text-ink transition-colors hover:text-brand">
        홈
      </a>
      <a href={practiceUrl} className="text-ink transition-colors hover:text-brand">
        모의고사 문제 연습
      </a>
      <button
        type="button"
        onClick={() => window.alert("준비 중입니다!")}
        className="text-ink transition-colors hover:text-brand"
      >
        유형별 문제 연습
      </button>
    </div>
  );
}
