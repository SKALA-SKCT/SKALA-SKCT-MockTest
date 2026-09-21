import { Fragment } from "react";

// Only verified PDF transcriptions use these block delimiters; no HTML is evaluated.
export default function PdfExplanation({ text }: { text: string }) {
  return <div className="mt-2 space-y-3 text-sm leading-7 text-zinc-600 [overflow-wrap:anywhere]">
    {text.split("\n\n").map((block, index) => {
      const lines = block.split("\n");
      if (lines.length > 1 && lines.every(line => line.startsWith("|") && line.endsWith("|"))) {
        const rows = lines.map(line => line.slice(1, -1).split("|").map(cell => cell.trim()));
        return <div key={index} className="overflow-x-auto"><table className="w-full border-collapse text-center">
          <thead><tr>{rows[0].map((cell, column) => <th key={column} className="border border-zinc-300 bg-zinc-100 px-3 py-1 font-medium">{cell}</th>)}</tr></thead>
          <tbody>{rows.slice(1).map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-zinc-300 bg-white px-3 py-1">{cell}</td>)}</tr>)}</tbody>
        </table></div>;
      }
      const seating = block.match(/^\[\[seating:([^\]]+)\]\]$/);
      if (seating) {
        const labels = seating[1].split(",");
        const positions = [[160,20],[275,80],[275,190],[160,250],[45,190],[45,80]];
        return <svg key={index} viewBox="0 0 320 270" role="img" aria-label={`원본 원탁 배치도: 위부터 시계 방향 ${labels.join(", ")}`} className="w-full max-w-xs bg-white">
          <circle cx="160" cy="135" r="95" fill="none" stroke="currentColor" />
          {labels.map((label, i) => <text key={i} x={positions[i][0]} y={positions[i][1]} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize="14">{label}</text>)}
        </svg>;
      }
      return <Fragment key={index}><p className="whitespace-pre-line">{block}</p></Fragment>;
    })}
  </div>;
}
