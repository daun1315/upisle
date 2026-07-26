# My Blog (GitHub Pages + Google Docs 자동 연동)

구글 문서에 쓴 글을 그대로 가져와 보여주는 개인 블로그입니다.
본문은 흑백, 우측 사이드바는 보라색 카테고리 목록입니다.

## 1. 저장소 만들기

1. GitHub에서 새 저장소를 만듭니다 (Public이어야 GitHub Pages 무료로 사용 가능).
2. 이 폴더의 내용을 그 저장소에 push 합니다.

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

## 2. 구글 문서 공유 설정

각 문서를 **"링크가 있는 모든 사용자" → "뷰어"** 로 공유해야 합니다.
(구글 문서 우측 상단 "공유" 버튼에서 설정)

문서 URL이 아래와 같다면:

```
https://docs.google.com/document/d/1AbCDeFGhiJKLmnop/edit
```

`1AbCDeFGhiJKLmnop` 부분이 문서 ID입니다.

## 3. content.json 수정

`content.json`에 문서 ID와 카테고리를 적어주세요.

```json
[
  { "docId": "1AbCDeFGhiJKLmnop", "category": "일상" },
  { "docId": "1XyZ98765abcdEFG", "category": "생각정리" }
]
```

- 글 제목은 구글 문서의 첫 번째 제목(H1 스타일)이 자동으로 사용됩니다.
- 글이 추가/수정될 때마다 이 파일에 문서만 추가하면 됩니다. 내용 자체는
  구글 문서를 수정하면 자동으로 반영됩니다.

## 4. GitHub Pages 켜기

1. 저장소 **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / 폴더: **/docs**
4. Save

## 5. 자동 업데이트

`.github/workflows/deploy.yml`이 다음 상황에 자동으로 사이트를 다시 빌드합니다:

- `main` 브랜치에 push할 때
- 3시간마다 (구글 문서 수정사항 자동 반영)
- Actions 탭에서 수동 실행(`workflow_dispatch`)할 때

빌드 주기를 바꾸고 싶으면 `deploy.yml`의 `cron` 값을 수정하세요.
(예: 매시간 → `0 * * * *`)

## 로컬에서 미리 확인하기

```bash
npm install
npm run build
npx serve docs
```

## 폴더 구조

```
content.json          # 구글 문서 ID + 카테고리 설정
assets/                # 원본 CSS/JS (빌드 시 docs로 복사됨)
scripts/build.mjs      # 구글 문서를 가져와 정적 사이트로 변환
docs/                  # 실제 배포되는 결과물 (GitHub Pages가 서빙)
.github/workflows/     # 자동 빌드 워크플로우
```

## 참고사항

- 구글 문서의 색상/폰트는 무시되고, 굵기·기울임·밑줄·정렬·글자크기만
  유지된 채로 흑백 사이트에 반영됩니다.
- 문서가 "링크가 있는 모든 사용자"로 공유되어 있지 않으면 빌드가 실패합니다.
  Actions 탭의 로그에서 에러 메시지를 확인할 수 있습니다.
