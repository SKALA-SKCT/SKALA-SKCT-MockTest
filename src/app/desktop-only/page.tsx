export default function DesktopOnlyPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
      <section className="card w-full p-10 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl font-black text-brand">
          SK
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
          Desktop Only
        </p>
        <h1 className="mt-3 text-3xl font-black text-ink">
          데스크탑에서 이용해주세요.
        </h1>
        <p className="mt-5 text-sm leading-7 text-ink-2">
          SKCT 스터디는 긴 지문, 표, 자료 이미지, 결과 차트를 한 화면에서
          확인해야 해서 모바일 화면을 지원하지 않습니다. 노트북 또는 데스크탑
          브라우저로 다시 접속해주세요.
        </p>
        <div className="mt-7 rounded-xl border border-hairline bg-page px-5 py-4 text-left text-sm leading-6 text-ink-2">
          <p className="font-semibold text-ink">권장 환경</p>
          <p className="mt-1">가로 1024px 이상 화면의 Chrome, Edge, Safari</p>
        </div>
      </section>
    </div>
  );
}
