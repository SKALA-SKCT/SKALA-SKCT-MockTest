export default function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="h-[26px] w-auto" src="/assets/sk-logo.svg" alt="SK" />
      <span className="whitespace-nowrap text-[22px] font-bold leading-none text-ink">
        SKALA-SKCT
      </span>
      <span className="whitespace-nowrap text-sm font-semibold text-ink-2">
        실전 모의고사
      </span>
    </span>
  );
}
