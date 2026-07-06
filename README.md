# 1-9반 시험 자료 다운로드 사이트

과목별 시험 자료(PDF 등)를 열람·다운로드할 수 있는 정적 웹사이트입니다.
모든 콘텐츠는 **`data.json` 파일 하나**로 관리하며, 별도의 관리자 페이지 없이
GitHub 웹 UI에서 텍스트 편집만으로 과목·문서·링크를 추가/삭제할 수 있습니다.

## 구조

```
exam-site/
├── index.html     # 페이지 골격 (제목·상단 링크·과목 섹션·푸터)
├── styles.css     # 디자인
├── app.js         # data.json을 읽어와 화면에 렌더링
├── data.json      # ★ 모든 콘텐츠를 여기서 관리
└── files/         # PDF 등 실제 자료 파일
```

- `app.js`가 `data.json`을 불러와 **subjects 순서 그대로** 과목 섹션과 문서 목록을 그립니다.
- 문서 `url`에 공백·괄호·`+` 같은 특수문자가 있어도 `encodeURI`로 처리해 정상적으로 열립니다.
- `.pdf`가 아닌 파일(`.sdocx` 등)도 그대로 다운로드 링크로 처리됩니다.

## data.json 형식

```json
{
  "topLinks": [
    { "label": "표시할 텍스트", "url": "https://..." },
    { "label": "문제로 연습하기", "url": "/testlab/" }
  ],
  "subjects": [
    {
      "name": "국어",
      "documents": [
        { "title": "문서 제목", "url": "https://raw.githubusercontent.com/HANSIU-cmd/exam-site/main/files/파일명.pdf" }
      ]
    }
  ]
}
```

> `url`은 리포 `files/` 폴더에 올린 파일의 **raw 링크**입니다.
> 형식: `https://raw.githubusercontent.com/HANSIU-cmd/exam-site/main/files/<파일명>`

---

## 사용 가이드

### (a) 과목 추가 / 삭제
`data.json`의 `subjects` 배열을 편집합니다. **배열 순서 = 화면 표시 순서**입니다.

- **추가**: 원하는 위치에 항목을 넣습니다.
  ```json
  { "name": "기술가정", "documents": [] }
  ```
- **삭제**: 해당 과목 객체(`{ ... }`)를 통째로 지웁니다.
  과목을 지우면 그 안의 문서 목록도 함께 사라지니, 필요하면 `files/`의 파일도 정리하세요.

### (b) 문서 추가 / 삭제
1. **PDF 업로드**: GitHub 리포의 `files/` 폴더에서 `Add file → Upload files`로 자료를 올립니다.
2. **data.json 편집**: 해당 과목의 `documents` 배열에 항목을 추가합니다. **위에서 아래 = 등록 순서**입니다.
   ```json
   { "title": "화면에 보일 이름", "url": "https://raw.githubusercontent.com/HANSIU-cmd/exam-site/main/files/올린파일명.pdf" }
   ```
   - `title`: 화면에 표시되는 문서 이름 (파일명과 달라도 됩니다)
   - `url`: 방금 올린 파일의 raw 링크 (`files/` 뒤에 **실제 파일명 그대로**, 공백·괄호 포함)
- **삭제**: `documents`에서 해당 항목을 지웁니다.

### (c) 상단 링크 추가 / 수정 / 삭제
상단 링크는 `data.json`의 **`topLinks` 배열**로 관리합니다. **배열 순서 = 화면에 보이는 왼→오른쪽 순서**입니다.

```json
"topLinks": [
  { "label": "수행평가 캘린더 샘플", "url": "https://perf-calendar-prototype.vercel.app/" },
  { "label": "문제로 연습하기", "url": "/testlab/" }
]
```

- **수정**: 해당 항목의 `label`(표시 텍스트) 또는 `url`(주소)을 바꿉니다.
- **추가**: 원하는 위치에 `{ "label": "...", "url": "..." }` 항목을 넣습니다.
- **삭제**: 해당 `{ ... }` 항목을 통째로 지웁니다.

**새 탭 vs 같은 탭은 url을 보고 자동으로 결정됩니다** (별도 설정 불필요):

| url 형태 | 예시 | 열리는 방식 | 표시 |
|---|---|---|---|
| `http://` / `https://` 로 시작 (외부) | `https://example.com` | **새 탭** | 끝에 ↗ |
| `/` 로 시작 (같은 사이트 내부) | `/testlab/` | **같은 탭** | 화살표 없음 |

> 내부 페이지(예: `/testlab/`)는 리포에 해당 폴더/파일이 있어야 열립니다.
> 예: `/testlab/` → 리포의 `testlab/index.html`.

### (d) ⚠️ 파일 삭제 시 주의
`files/`에서 파일을 지웠다면, **`data.json`에서도 그 파일을 가리키는 항목을 반드시 함께 삭제**하세요.
그렇지 않으면 화면에 뜨는 다운로드 링크가 깨진 파일(404)을 가리키게 됩니다.

---

## (e) Vercel 배포

빌드 과정이 없는 **정적 사이트**라 그대로 연결하면 배포됩니다.

1. [vercel.com](https://vercel.com) 에 GitHub 계정으로 로그인
2. **Add New → Project** → `HANSIU-cmd/exam-site` 리포 선택 → **Import**
3. 설정은 기본값 그대로 둡니다.
   - Framework Preset: **Other**
   - Build Command: 비움 (없음)
   - Output Directory: 비움 (루트)
4. **Deploy** 클릭 → 잠시 후 `https://<프로젝트명>.vercel.app` 주소가 생성됩니다.

이후 `main` 브랜치에 커밋(= `data.json`이나 `files/` 변경)이 올라갈 때마다 **자동으로 재배포**됩니다.

로컬에서 미리 보려면 정적 서버가 필요합니다 (`data.json`을 `fetch`로 읽기 때문):
```bash
# 예시 — 아무 정적 서버나 사용 가능
npx serve .
```
