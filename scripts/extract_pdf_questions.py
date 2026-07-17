#!/usr/bin/env python3
"""
Extract SKCT question JSON from the 12 PDF exports.

The PDFs are rendered exam pages: the left column contains the question and
choices, while the right column contains the answer/explanation. This script
uses PDF text coordinates to keep those regions separated.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import sys
import html
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

from PIL import Image
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data"
ASSET_DIR = ROOT / "public" / "exam-assets"

PDFS = [
    ("SK 2023년 하반기 온라인 1회", Path("/Users/parkkunmin/Downloads/SK 2023년 하반기 온라인 1회.pdf")),
    ("SK 2023년 하반기 온라인 2회", Path("/Users/parkkunmin/Downloads/SK 2023년 하반기 온라인 2회.pdf")),
    ("SK 2024년 상반기", Path("/Users/parkkunmin/Downloads/SK 2024년 상반기.pdf")),
    ("SK 2024년 하반기 1회", Path("/Users/parkkunmin/Downloads/SK 2024년 하반기 1회.pdf")),
    ("SK 2024년 하반기 2회", Path("/Users/parkkunmin/Downloads/SK 2024년 하반기 2회.pdf")),
    ("SK 2024년 하반기 3회", Path("/Users/parkkunmin/Downloads/SK 2024년 하반기 3회.pdf")),
    ("SK 2025년 상반기 1회", Path("/Users/parkkunmin/Downloads/SK 2025년 상반기 1회.pdf")),
    ("SK 2025년 상반기 2회", Path("/Users/parkkunmin/Downloads/SK 2025년 상반기 2회.pdf")),
    ("SK 2025년 상반기 3회", Path("/Users/parkkunmin/Downloads/SK 2025년 상반기 3회.pdf")),
    ("SK 2025년 하반기 1회", Path("/Users/parkkunmin/Downloads/SK 2025년 하반기 1회.pdf")),
    ("SK 2025년 하반기 2회", Path("/Users/parkkunmin/Downloads/SK 2025년 하반기 2회.pdf")),
    ("SK 2025년 하반기 3회", Path("/Users/parkkunmin/Downloads/SK 2025년 하반기 3회.pdf")),
]

SUBJECT_BY_RANGE = [
    (1, 20, "언어이해"),
    (21, 40, "자료해석"),
    (41, 60, "창의수리"),
    (61, 80, "언어추리"),
    (81, 100, "수열추리"),
]

ANSWER_RE = re.compile(r"정\s*답\s*:\s*([1-5])(?:\s*번)?")
HEADER_RE = re.compile(r"(?:^|\s)(\d{1,3})\s*번(?:\s*/\s*100)?")
UI_PHRASES = (
    "정답",
    "채점",
    "해설",
    "오답노트",
    "오답노",
    "트 추가",
    "시험 정보방",
    "게시글 작성",
    "위 시험과 관련된",
    "이해가 안되거나",
    "질문을 남겨보세요",
    "조회수",
    "댓글",
)

TEXT_FIXES = (
    ("으 로", "으로"),
    ("적절 한", "적절한"),
    ("제작 된", "제작된"),
    ("제작 할", "제작할"),
    ("공격 할", "공격할"),
    ("가거 나", "가거나"),
    ("해야 한 다", "해야 한다"),
    ("필요하 다", "필요하다"),
    ("머신러 닝", "머신러닝"),
    ("딥페이 크", "딥페이크"),
    ("스마트공 장", "스마트공장"),
    ("지금까 지", "지금까지"),
    ("강화해 야", "강화해야"),
    ("기 술", "기술"),
    ("할 수 있 어", "할 수 있어"),
    ("어렵 다", "어렵다"),
    ("높 다", "높다"),
    ("낮 다", "낮다"),
    ("같 다", "같다"),
    ("하 다", "하다"),
    ("이 다", "이다"),
)


@dataclass
class Line:
    y: float
    x: float
    text: str


def subject_for(number: int) -> str:
    for start, end, subject in SUBJECT_BY_RANGE:
        if start <= number <= end:
            return subject
    raise ValueError(f"question number outside 1..100: {number}")


def normalize_line(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace(" .", ".").replace(" ,", ",")
    text = text.replace("( ", "(").replace(" )", ")")
    text = text.replace(" / ", "/")
    return text


def compact_text(lines: Iterable[str]) -> str:
    out: list[str] = []
    for line in lines:
        line = normalize_line(line)
        if not line:
            continue
        if any(phrase in line for phrase in UI_PHRASES):
            continue
        out.append(line)
    return "\n".join(out).strip()


def cleanup_text(text: str) -> str:
    text = re.sub(r"\s*\n\s*", "", text)
    text = re.sub(r"([.?!)])([가-힣A-Za-z<])", r"\1 \2", text)
    text = re.sub(r"\s+", " ", text).strip()
    for before, after in TEXT_FIXES:
        text = text.replace(before, after)
    text = text.replace("다 음", "다음")
    text = text.replace("일정 한", "일정한")
    text = text.replace("필요 가", "필요가")
    text = text.replace("더 크다 고", "더 크다고")
    text = re.sub(r"([가-힣])\s+([,.])", r"\1\2", text)
    return text


def page_lines(
    page,
    char_predicate: Callable[[float], bool],
    line_predicate: Callable[[float], bool] | None = None,
) -> list[Line]:
    items: list[tuple[float, float, float, str]] = []

    def visitor(text, _cm, tm, _font_dict, font_size):
        if text.strip():
            items.append((float(tm[4]), float(tm[5]), float(font_size), text))

    page.extract_text(visitor_text=visitor)

    rows: dict[int, list[tuple[float, float, str]]] = defaultdict(list)
    for x, y, font_size, text in items:
        if char_predicate(x):
            rows[round(y)].append((x, font_size, text))

    lines: list[Line] = []
    for y, row in rows.items():
        row = sorted(row, key=lambda item: item[0])
        pieces: list[str] = []
        last_end: float | None = None
        min_x = min(x for x, _font_size, _text in row)
        for x, font_size, text in row:
            if last_end is not None and x - last_end > max(6, font_size * 0.45):
                pieces.append(" ")
            pieces.append(text)
            last_end = x + len(text) * font_size * 0.48
        line = normalize_line("".join(pieces))
        if line and (line_predicate is None or line_predicate(min_x)):
            lines.append(Line(float(y), min_x, line))
    return sorted(lines, key=lambda line: line.y)


def question_number(lines: list[Line]) -> int | None:
    joined = " ".join(line.text for line in lines[:8])
    for match in HEADER_RE.finditer(joined):
        n = int(match.group(1))
        if 1 <= n <= 100:
            return n
    return None


def answer_from(lines: list[Line]) -> int | None:
    joined = " ".join(line.text for line in lines)
    match = ANSWER_RE.search(joined)
    return int(match.group(1)) if match else None


def relevant_left_lines(lines: list[Line], number: int) -> list[Line]:
    start = 0
    marker = re.compile(rf"^{number}\s*번\s*/")
    for i, line in enumerate(lines):
        if marker.search(line.text):
            start = i + 1
            break

    kept: list[Line] = []
    for line in lines[start:]:
        if line.y < 120:
            continue
        if line.text in {"••", "•••", "100", "SK", "1"}:
            continue
        if any(phrase in line.text for phrase in UI_PHRASES):
            continue
        kept.append(line)
    return kept


def split_body_choices(lines: list[Line]) -> tuple[str, list[str]]:
    if not lines:
        return "", ["①", "②", "③", "④", "⑤"]

    blocks: list[list[Line]] = []
    current: list[Line] = [lines[0]]
    for prev, line in zip(lines, lines[1:]):
        gap = line.y - prev.y
        if gap > 30:
            blocks.append(current)
            current = [line]
        else:
            current.append(line)
    blocks.append(current)

    if len(blocks) >= 6:
        body_blocks = blocks[:-5]
        choice_blocks = blocks[-5:]
    else:
        body_blocks = [blocks[0]]
        choice_blocks = blocks[1:]

    body = compact_text(line.text for block in body_blocks for line in block)
    choices = [
        compact_text(line.text for line in block) or f"{idx}번"
        for idx, block in enumerate(choice_blocks, start=1)
    ]
    while len(choices) < 5:
        choices.append(f"{len(choices) + 1}번")
    return body, choices[:5]


def split_blocks(lines: list[Line]) -> list[list[Line]]:
    if not lines:
        return []
    blocks: list[list[Line]] = []
    current: list[Line] = [lines[0]]
    for prev, line in zip(lines, lines[1:]):
        gap = line.y - prev.y
        if gap > 30:
            blocks.append(current)
            current = [line]
        else:
            current.append(line)
    blocks.append(current)
    return blocks


@dataclass
class BBoxLine:
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    text: str


def page_bbox_lines(pdf: Path, page_number: int, cache: dict[int, list[BBoxLine]], tmp_dir: Path) -> list[BBoxLine]:
    if page_number in cache:
        return cache[page_number]

    out = tmp_dir / f"bbox-{page_number}.html"
    subprocess.run(
        [
            "pdftotext",
            "-bbox-layout",
            "-f",
            str(page_number),
            "-l",
            str(page_number),
            str(pdf),
            str(out),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    raw = out.read_text(encoding="utf-8", errors="ignore")
    lines: list[BBoxLine] = []
    for line_match in re.finditer(
        r'<line xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">(.*?)</line>',
        raw,
        flags=re.S,
    ):
        words = re.findall(r"<word [^>]*>(.*?)</word>", line_match.group(5), flags=re.S)
        text = html.unescape(" ".join(re.sub(r"<[^>]+>", "", word).strip() for word in words)).strip()
        if not text:
            continue
        lines.append(
            BBoxLine(
                x_min=float(line_match.group(1)),
                y_min=float(line_match.group(2)),
                x_max=float(line_match.group(3)),
                y_max=float(line_match.group(4)),
                text=text,
            )
        )
    cache[page_number] = lines
    return lines


def bbox_visual_crop_bounds(
    pdf: Path,
    page_number: int,
    question_number: int,
    cache: dict[int, list[BBoxLine]],
    tmp_dir: Path,
) -> tuple[float, float, float, float] | None:
    lines = [
        line
        for line in page_bbox_lines(pdf, page_number, cache, tmp_dir)
        if line.x_min < 300
        and 80 < line.y_min < 730
        and not re.search(r"\d+\s*번\s*/\s*100", line.text)
        and not any(phrase in line.text for phrase in UI_PHRASES)
    ]
    if len(lines) < 2:
        return None

    lines.sort(key=lambda line: line.y_min)
    blocks: list[list[BBoxLine]] = []
    current: list[BBoxLine] = [lines[0]]
    for prev, line in zip(lines, lines[1:]):
        if line.y_min - prev.y_min > 30:
            blocks.append(current)
            current = [line]
        else:
            current.append(line)
    blocks.append(current)
    if len(blocks) < 6:
        view_lines = bbox_view_lines(lines)
        if view_lines:
            special = bbox_sequence_view_bounds(lines, view_lines)
            if special is not None:
                return special

        first_question_block = blocks[0]
        question_bottom = max(line.y_max for line in first_question_block)
        choice_candidates = [
            line
            for line in lines
            if 70 <= line.x_min <= 100 and line.y_min > question_bottom + 80
        ]
        if choice_candidates:
            visual_top = question_bottom + 4
            visual_bottom = choice_candidates[0].y_min - 6
            if visual_bottom > visual_top + 16:
                return 24, visual_top, 390, visual_bottom
        return None

    body_blocks = blocks[:-5]
    choice_blocks = blocks[-5:]
    first_question_block = body_blocks[0]
    choice_start = choice_blocks[0][0].y_min
    view_lines = bbox_view_lines([line for block in body_blocks for line in block])
    if view_lines:
        visual_top = min(line.y_min for line in view_lines) - 4
    else:
        visual_top = max(line.y_max for line in first_question_block) + 4
    visual_bottom = choice_start - 6

    if visual_bottom <= visual_top + 16:
        return None

    all_view_lines = bbox_view_lines(lines)
    if question_number >= 81 and all_view_lines and (not view_lines or visual_top > min(line.y_min for line in all_view_lines) + 30):
        special = bbox_sequence_view_bounds(lines, all_view_lines)
        if special is not None:
            return special

    return 24, visual_top, 390, visual_bottom


def bbox_view_lines(lines: list[BBoxLine]) -> list[BBoxLine]:
    return [
        line
        for line in lines
        if line.text.strip() == "<보기>" or (line.text.strip().startswith("<보기>") and len(line.text.strip()) <= 12)
    ]


def bbox_sequence_view_bounds(lines: list[BBoxLine], view_lines: list[BBoxLine]) -> tuple[float, float, float, float] | None:
    view_top = min(line.y_min for line in view_lines)
    visual_top = view_top - 4
    view_content = [
        line
        for line in lines
        if view_top + 20 < line.y_min < view_top + 125 and line.x_min < 180
    ]
    if view_content:
        visual_bottom = max(line.y_max for line in view_content) + 10
        if visual_bottom > visual_top + 16:
            return 24, visual_top, 390, visual_bottom
    return None


def explanation_from(lines: list[Line]) -> str:
    answer_idx = 0
    for i, line in enumerate(lines):
        if ANSWER_RE.search(line.text):
            answer_idx = i + 1
            break

    explanation: list[str] = []
    for line in lines[answer_idx:]:
        if any(phrase in line.text for phrase in UI_PHRASES):
            break
        if re.search(r"^\d{4}\s*년", line.text):
            continue
        explanation.append(line.text)
    return compact_text(explanation)


def should_attach_image(number: int) -> bool:
    return 21 <= number <= 40 or 81 <= number <= 100


def render_page(pdf: Path, page_number: int, cache: dict[int, Path], tmp_dir: Path) -> Path:
    if page_number in cache:
        return cache[page_number]

    prefix = tmp_dir / f"page-{page_number}"
    subprocess.run(
        [
            "pdftoppm",
            "-png",
            "-singlefile",
            "-r",
            "170",
            "-f",
            str(page_number),
            "-l",
            str(page_number),
            str(pdf),
            str(prefix),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    rendered = prefix.with_suffix(".png")
    cache[page_number] = rendered
    return rendered


def write_question_image(
    pdf: Path,
    round_number: int,
    question_number: int,
    pages: list[int],
    render_cache: dict[int, Path],
    bbox_cache: dict[int, list[BBoxLine]],
    tmp_dir: Path,
) -> str:
    crops: list[Image.Image] = []
    for page_number in pages[:2]:
        rendered = render_page(pdf, page_number, render_cache, tmp_dir)
        img = Image.open(rendered).convert("RGB")
        width, height = img.size
        bounds = bbox_visual_crop_bounds(pdf, page_number, question_number, bbox_cache, tmp_dir) if page_number == pages[0] else None
        if bounds is not None:
            scale = width / 595.91998
            x_min, y_min, x_max, y_max = bounds
            x1 = max(0, int(x_min * scale))
            y1 = max(0, int(y_min * scale))
            x2 = min(width, int(x_max * scale))
            y2 = min(height, int(y_max * scale))
            raw_crop = img.crop((x1, y1, x2, y2))
        else:
            raw_crop = image_only_visual_crop(img)
            if raw_crop is None:
                x1 = int(width * 0.02)
                x2 = int(width * 0.48)
                y1 = int(height * 0.08)
                y2 = int(height * 0.94)
                raw_crop = img.crop((x1, y1, x2, y2))

        crop = trim_visual_whitespace(remove_right_sidebar(raw_crop))
        if question_number >= 81:
            crop = remove_sequence_choices(crop)
        crop = remove_choice_after_gap(crop)
        crops.append(crop)

    if not crops:
        raise ValueError(f"round {round_number} q{question_number}: no pages to crop")

    if len(crops) == 1:
        stitched = crops[0]
    else:
        stitched = Image.new(
            "RGB",
            (max(c.width for c in crops), sum(c.height for c in crops)),
            "white",
        )
        y = 0
        for crop in crops:
            stitched.paste(crop, (0, y))
            y += crop.height

    out_dir = ASSET_DIR / f"round-{round_number}"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"q-{question_number}.png"
    stitched.save(out_path, optimize=True)
    return f"/exam-assets/round-{round_number}/q-{question_number}.png"


def trim_visual_whitespace(image: Image.Image) -> Image.Image:
    gray = image.convert("L")
    pixels = gray.load()
    width, height = gray.size
    xs: list[int] = []
    ys: list[int] = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y] < 245:
                xs.append(x)
                ys.append(y)
    if not xs or not ys:
        return image

    pad = 10
    left = max(0, min(xs) - pad)
    top = max(0, min(ys) - pad)
    right = min(width, max(xs) + pad)
    bottom = min(height, max(ys) + pad)
    if right <= left or bottom <= top:
        return image
    return image.crop((left, top, right, bottom))


def remove_right_sidebar(image: Image.Image) -> Image.Image:
    gray = image.convert("L")
    width, height = gray.size
    pixels = gray.load()
    hit_columns: list[int] = []
    for x in range(int(width * 0.45), width):
        grayish = 0
        for y in range(height):
            value = pixels[x, y]
            if 205 <= value <= 245:
                grayish += 1
        if grayish / max(1, height) > 0.72:
            hit_columns.append(x)

    if not hit_columns:
        return image

    run_start = hit_columns[0]
    previous = hit_columns[0]
    for x in hit_columns[1:] + [width + 1]:
        if x == previous + 1:
            previous = x
            continue
        run_width = previous - run_start + 1
        touches_right_edge = previous >= width - 3
        if run_width >= 32 or (touches_right_edge and run_width >= 8):
            return image.crop((0, 0, max(1, run_start - 8), height))
        run_start = previous = x
    return image


def image_only_visual_crop(image: Image.Image) -> Image.Image | None:
    width, height = image.size
    left = int(width * 0.02)
    right = int(width * 0.48)
    top = int(height * 0.03)
    bottom = int(height * 0.75)
    candidate = image.crop((left, top, right, bottom))
    gray = candidate.convert("L")
    pixels = gray.load()
    row_hits: list[tuple[int, int, int, int]] = []
    for y in range(gray.height):
        xs = [x for x in range(gray.width) if pixels[x, y] < 120]
        if len(xs) > gray.width * 0.45:
            row_hits.append((y, min(xs), max(xs), len(xs)))

    best: tuple[int, int, int, int] | None = None
    best_span = 0
    for idx, (top_line, x_min, x_max, _count) in enumerate(row_hits):
        for bottom_line, bx_min, bx_max, _b_count in row_hits[idx + 1 :]:
            gap = bottom_line - top_line
            if 28 <= gap <= 170:
                span = min(x_max - x_min, bx_max - bx_min)
                if span > best_span:
                    best_span = span
                    best = (top_line, bottom_line, min(x_min, bx_min), max(x_max, bx_max))
    if best and best_span > candidate.width * 0.55:
        top_line, bottom_line, x_min, x_max = best
        crop_left = max(0, x_min - 8)
        crop_right = min(candidate.width, x_max + 8)
        crop_top = max(0, top_line - 52)
        crop_bottom = min(candidate.height, bottom_line + 12)
        return candidate.crop((crop_left, crop_top, crop_right, crop_bottom))
    return None


def remove_sequence_choices(image: Image.Image) -> Image.Image:
    gray = image.convert("L")
    width, height = gray.size
    pixels = gray.load()
    border_rows = [
        y
        for y in range(height)
        if sum(1 for x in range(width) if pixels[x, y] < 210) > width * 0.4
    ]
    row_groups: list[tuple[int, int]] = []
    if border_rows:
        start = previous = border_rows[0]
        for y in border_rows[1:] + [height + 1]:
            if y == previous + 1:
                previous = y
                continue
            row_groups.append((start, previous))
            start = previous = y
    if len(row_groups) >= 2:
        return image.crop((0, 0, width, min(height, row_groups[-1][1] + 10)))

    left_band = max(40, int(width * 0.18))
    start_y = int(height * 0.28)
    run_start: int | None = None
    for y in range(start_y, height):
        dark = sum(1 for x in range(left_band) if pixels[x, y] < 130)
        if dark > 10:
            if run_start is None:
                run_start = y
            continue
        if run_start is not None and y - run_start >= 8:
            return image.crop((0, 0, width, max(1, run_start - 18)))
        run_start = None
    if run_start is not None and height - run_start >= 8:
        return image.crop((0, 0, width, max(1, run_start - 18)))
    return image


def remove_choice_after_gap(image: Image.Image) -> Image.Image:
    if image.height < 180:
        return image

    gray = image.convert("L")
    width, height = gray.size
    pixels = gray.load()
    scan_width = min(90, width)
    visited: set[tuple[int, int]] = set()
    for start_y in range(int(height * 0.45), height):
        for start_x in range(scan_width):
            if (start_x, start_y) in visited or pixels[start_x, start_y] >= 120:
                continue
            stack = [(start_x, start_y)]
            visited.add((start_x, start_y))
            xs: list[int] = []
            ys: list[int] = []
            while stack:
                x, y = stack.pop()
                xs.append(x)
                ys.append(y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or nx >= scan_width or ny < int(height * 0.45) or ny >= height:
                        continue
                    if (nx, ny) in visited or pixels[nx, ny] >= 120:
                        continue
                    visited.add((nx, ny))
                    stack.append((nx, ny))
            if len(xs) < 40:
                continue
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            component_width = x_max - x_min + 1
            component_height = y_max - y_min + 1
            looks_like_choice_circle = 22 <= component_width <= 55 and 22 <= component_height <= 55
            has_blank_gap = True
            for yy in range(max(0, y_min - 38), max(0, y_min - 8)):
                dark = sum(1 for x in range(scan_width) if pixels[x, yy] < 140)
                if dark > 4:
                    has_blank_gap = False
                    break
            if looks_like_choice_circle and has_blank_gap:
                return image.crop((0, 0, width, max(1, y_min - 18)))
    return image


def extract_pdf(pdf: Path, round_number: int) -> list[dict]:
    reader = PdfReader(str(pdf))
    by_number: dict[int, dict[str, object]] = {}

    for page_index, page in enumerate(reader.pages, start=1):
        left = page_lines(page, lambda x: x < 460, lambda min_x: min_x < 350)
        right = page_lines(page, lambda x: x >= 350, lambda min_x: min_x >= 400)
        number = question_number(left + right)
        if number is None:
            continue

        left_content = relevant_left_lines(left, number)
        if left_content:
            existing = by_number.setdefault(
                number,
                {
                    "left": [],
                    "right": [],
                    "pages": [],
                    "answer": None,
                },
            )
            existing["left"].extend(left_content)
            existing["right"].extend(right)
            existing["pages"].append(page_index)

        answer = answer_from(left + right)
        if answer is not None:
            existing = by_number.setdefault(
                number,
                {
                    "left": [],
                    "right": [],
                    "pages": [],
                    "answer": None,
                },
            )
            existing["answer"] = answer

    questions: list[dict] = []
    with tempfile.TemporaryDirectory(prefix=f"skct-round-{round_number}-") as tmp:
        tmp_dir = Path(tmp)
        render_cache: dict[int, Path] = {}
        bbox_cache: dict[int, list[BBoxLine]] = {}
        for number in range(1, 101):
            raw = by_number.get(number)
            if not raw:
                raise ValueError(f"{pdf.name}: missing question {number}")
            body, choices = split_body_choices(raw["left"])  # type: ignore[arg-type]
            answer = raw["answer"]
            if not isinstance(answer, int):
                raise ValueError(f"{pdf.name}: missing answer for question {number}")
            if not body:
                body = f"{number}번 문항"
            item = {
                "number": number,
                "subject": subject_for(number),
                "body": cleanup_text(body),
                "choices": [cleanup_text(choice) for choice in choices],
                "answer": answer,
                "explanation": cleanup_text(explanation_from(raw["right"])),  # type: ignore[arg-type]
            }
            if should_attach_image(number):
                item["imageUrl"] = write_question_image(
                    pdf,
                    round_number,
                    number,
                    raw["pages"],  # type: ignore[arg-type]
                    render_cache,
                    bbox_cache,
                    tmp_dir,
                )
            questions.append(item)
    return questions


def selected_rounds() -> set[int] | None:
    if len(sys.argv) == 1:
        return None
    selected = {int(arg) for arg in sys.argv[1:]}
    invalid = [n for n in selected if n < 1 or n > len(PDFS)]
    if invalid:
        raise ValueError(f"invalid round numbers: {invalid}")
    return selected


def main() -> None:
    selected = selected_rounds()
    OUT_DIR.mkdir(exist_ok=True)
    if selected is None and ASSET_DIR.exists():
        shutil.rmtree(ASSET_DIR)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for idx, (title, pdf) in enumerate(PDFS, start=1):
        if selected is not None and idx not in selected:
            continue
        if not pdf.exists():
            raise FileNotFoundError(pdf)
        questions = extract_pdf(pdf, idx)
        out_path = OUT_DIR / f"round-{idx}.json"
        out_path.write_text(
            json.dumps(questions, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        manifest.append({"round": idx, "title": title, "pdf": str(pdf), "questions": len(questions)})
        print(f"round-{idx}: {title} -> {len(questions)} questions")

    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
