export default function BrandMark() {
  return (
    <span className="inline-flex h-5 items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="h-full w-auto" src="/assets/sk-logo.svg" alt="SK" />
      <span className="whitespace-nowrap text-[17px] font-bold leading-none text-ink">
        SKALA-SKCT
      </span>
    </span>
  );
}
