"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Option = { value: string; label: string };

function Picker({ label, value, options, onSelect }: {
  label: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
}) {
  const current = options.find((option) => option.value === value) ?? options[0];
  return (
    <label className="grid min-w-36 gap-1.5 text-xs font-bold text-zinc-500">
      {label}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-400">
          {current?.label}
          <span aria-hidden className="text-zinc-400">▾</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map((option) => (
            <DropdownMenuItem key={option.value} onSelect={() => onSelect(option.value)}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </label>
  );
}

export function AdminQuestionPicker({ exam, subject, number, subjects, numbers }: {
  exam: number;
  subject: string;
  number: string;
  subjects: readonly string[];
  numbers: number[];
}) {
  const router = useRouter();
  const go = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ tab: "questions", exam: String(exam), subject, number });
    Object.entries(patch).forEach(([key, value]) => params.set(key, value));
    if (patch.subject) params.set("number", "all");
    router.push(`/admin?${params.toString()}`);
  };

  return (
    <div className="chart-card flex flex-wrap items-end gap-3 p-4">
      <Picker
        label="회차"
        value={String(exam)}
        options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}회차` }))}
        onSelect={(value) => go({ exam: value })}
      />
      <Picker
        label="영역"
        value={subject}
        options={subjects.map((item) => ({ value: item, label: item }))}
        onSelect={(value) => go({ subject: value })}
      />
      <Picker
        label="문제 번호"
        value={number}
        options={[{ value: "all", label: "전체" }, ...numbers.map((n) => ({ value: String(n), label: `${n}번` }))]}
        onSelect={(value) => go({ number: value })}
      />
    </div>
  );
}
