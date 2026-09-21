export default function ShortestPathDiagram() {
  return (
    <svg viewBox="0 0 440 440" role="img" aria-label="원본 PDF의 최단 경로 해설 도형. 왼쪽 아래 A, 오른쪽 위 B, 왼쪽 위 1, 안쪽 왼쪽 위 2, 안쪽 오른쪽 아래 3, 오른쪽 아래 4." className="my-3 w-full max-w-sm bg-white">
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M20 20H420V420H20Z M20 120H420 M20 320H420 M120 20V420 M320 20V420 M220 20V120 M220 320V420 M20 220H120 M320 220H420" />
      </g>
      <g fill="currentColor">
        {[[20,20],[120,120],[320,320],[420,420],[20,420],[420,20]].map(([cx,cy]) => <circle key={`${cx}:${cy}`} cx={cx} cy={cy} r="5" />)}
      </g>
      <g fill="currentColor" fontSize="14">
        <text x="25" y="39">1</text><text x="127" y="140">2</text>
        <text x="327" y="340">3</text><text x="424" y="435">4</text>
        <text x="4" y="437">A</text><text x="424" y="15">B</text>
      </g>
    </svg>
  );
}
