# Linkareer CBT 원본 아카이브

2026년 SKCT 모의고사 문제셋을 전달받은 상태 그대로 보관한 압축 파일입니다.
각 압축 파일에는 원본 HTML과 JSON이 한 개씩 들어 있습니다.

## 파일

- `2026년-상반기-1회.tar.gz`
- `2026년-상반기-2회.tar.gz`
- `2026년-상반기-3회.tar.gz`
- `2026년-하반기-1회.tar.gz`
- `2026년-하반기-2회.tar.gz`

무결성은 `SHA256SUMS`로 확인합니다.

```bash
shasum -a 256 -c archives/linkareer-cbt/SHA256SUMS
```

압축 해제 예시:

```bash
tar -xzf archives/linkareer-cbt/2026년-상반기-1회.tar.gz
```
