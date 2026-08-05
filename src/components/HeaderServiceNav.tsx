"use client";

import Link from "next/link";

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
      <Link
        href="/"
        aria-current="page"
        className="text-brand transition-colors"
      >
        실전 모의고사
      </Link>
      <a href={practiceUrl} className="text-ink transition-colors hover:text-brand">
        모의고사 문제 연습
      </a>
      <a
        href="https://tutorial.skala-skct.com"
        className="text-ink transition-colors hover:text-brand"
      >
        유형별 문제 연습
      </a>
    </div>
  );
}
