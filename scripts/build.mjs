import fs from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";

const ROOT = path.resolve(process.cwd());
const DOCS_OUT = path.join(ROOT, "docs");
const POSTS_OUT = path.join(DOCS_OUT, "posts");
const ASSETS_SRC = path.join(ROOT, "assets");

// 본문 서식 중에서 유지할 CSS 속성 (색상/폰트/배경 등은 모두 제거하고
// 굵기·기울임·밑줄·정렬·글자크기만 구글 문서 그대로 유지한다)
const ALLOWED_PROPS = [
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
  "font-size",
  "font-family",
];

function slugify(str, fallback) {
  const base = (str || fallback || "post")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return base || fallback || "post";
}

function filterDeclarations(declStr) {
  return declStr
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => {
      const prop = d.split(":")[0]?.trim();
      return ALLOWED_PROPS.includes(prop);
    })
    .join("; ");
}

function cleanGoogleDocHtml(rawHtml) {
  const $ = cheerio.load(rawHtml);

  // 구글 문서는 <style> 안에 .c1, .c2 같은 클래스로 서식을 정의해두고
  // 본문 요소들이 class="c1 c2" 형태로 그 서식을 참조한다.
  const styleText = $("style").text();
  const classStyles = {};
  const ruleRegex = /\.([\w-]+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = ruleRegex.exec(styleText))) {
    classStyles[match[1]] = match[2];
  }

  $("body *").each((_, el) => {
    const $el = $(el);
    const classes = ($el.attr("class") || "").split(" ").filter(Boolean);
    let combined = "";
    classes.forEach((c) => {
      if (classStyles[c]) combined += classStyles[c] + ";";
    });
    const filtered = filterDeclarations(combined);

    $el.removeAttr("class");
    $el.removeAttr("id");

    if (filtered) {
      $el.attr("style", filtered);
    } else {
      $el.removeAttr("style");
    }
  });

  $("style").remove();

  // 빈 문단(엔터만 눌러서 만든 빈 줄)은 브라우저가 높이를 0으로 접어버려서
  // 사라져 보인다. 실제 텍스트가 없는 <p>에 줄바꿈 공백을 채워 높이를 유지시킨다.
  $("body p").each((_, el) => {
    const $el = $(el);
    const hasText = $el.text().trim().length > 0;
    const hasImage = $el.find("img").length > 0;
    if (!hasText && !hasImage) {
      $el.html("&nbsp;");
    }
  });

  // 빈 span, 불필요한 a name 앵커 등 정리
  $("a[name]").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("href")) $el.replaceWith($el.html() || "");
  });

  return $("body").html() || "";
}

async function fetchDocHtml(docId) {
  const url = `https://docs.google.com/document/d/${docId}/export?format=html`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(
      `문서(${docId})를 가져오지 못했습니다 (status ${res.status}). ` +
        `공유 설정이 "링크가 있는 모든 사용자 - 뷰어"인지 확인해주세요.`
    );
  }
  return await res.text();
}

function extractTitleAndExcerpt($, bodyHtml) {
  const $$ = cheerio.load(`<div id="root">${bodyHtml}</div>`);
  let title = $$("h1").first().text().trim();
  if (!title) {
    title = $$("p").first().text().trim().slice(0, 40);
  }
  let excerpt = "";
  $$("p").each((_, el) => {
    const t = $$(el).text().trim();
    if (t && t !== title && !excerpt) excerpt = t;
  });
  excerpt = excerpt.slice(0, 120);
  return { title: title || "제목 없음", excerpt };
}

function postPageTemplate({ title, category, bodyHtml, prev, next }) {
  const prevLink = prev
    ? `<a class="post-nav-link post-nav-prev" href="${prev.slug}.html">&larr; ${escapeHtml(
        prev.title
      )}</a>`
    : `<span class="post-nav-link post-nav-disabled">&larr; 이전글 없음</span>`;
  const nextLink = next
    ? `<a class="post-nav-link post-nav-next" href="${next.slug}.html">${escapeHtml(
        next.title
      )} &rarr;</a>`
    : `<span class="post-nav-link post-nav-disabled">다음글 없음 &rarr;</span>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="../style.css" />
</head>
<body>
<div class="layout">
  <main class="content">
    <a class="back-link" href="../index.html">&larr; 목록으로</a>
    <article class="post">
      <p class="post-category">${escapeHtml(category)}</p>
      <div class="post-body">${bodyHtml}</div>
    </article>
    <nav class="post-nav">
      ${prevLink}
      ${nextLink}
    </nav>
  </main>
  <aside class="sidebar" id="sidebar">
    <h2 class="sidebar-title">카테고리</h2>
    <ul class="category-list" id="category-list"></ul>
  </aside>
</div>
<script src="../app.js"></script>
</body>
</html>
`;
}

function indexPageTemplate() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>My Blog</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
<div class="layout">
  <main class="content">
    <h1 class="site-title">My Blog</h1>
    <ul class="post-list" id="post-list"></ul>
  </main>
  <aside class="sidebar" id="sidebar">
    <h2 class="sidebar-title">카테고리</h2>
    <ul class="category-list" id="category-list"></ul>
  </aside>
</div>
<script src="app.js"></script>
</body>
</html>
`;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  const configRaw = await fs.readFile(path.join(ROOT, "content.json"), "utf-8");
  // content.json 형식: { "카테고리명": ["docId1", "docId2"], ... }
  const config = JSON.parse(configRaw);

  await fs.mkdir(POSTS_OUT, { recursive: true });

  // 1단계: 카테고리별로 모든 문서를 가져와서 정보만 모아둔다 (아직 파일로 쓰지 않음)
  // 같은 카테고리 배열 안의 순서가 곧 이전글/다음글 순서가 된다.
  const posts = [];

  for (const [category, docIds] of Object.entries(config)) {
    const categoryPosts = [];

    for (const docId of docIds) {
      if (!docId || docId.startsWith("여기에")) {
        console.warn("건너뜀: content.json에 실제 구글 문서 ID를 입력해주세요.");
        continue;
      }
      console.log(`가져오는 중: ${docId} (${category})`);
      const rawHtml = await fetchDocHtml(docId);
      const bodyHtml = cleanGoogleDocHtml(rawHtml);
      const { title, excerpt } = extractTitleAndExcerpt(null, bodyHtml);
      const slug = slugify(title, docId);

      categoryPosts.push({
        slug,
        title,
        excerpt,
        category,
        bodyHtml,
      });
    }

    categoryPosts.forEach((p, i) => {
      p.prev = i > 0 ? categoryPosts[i - 1] : null;
      p.next = i < categoryPosts.length - 1 ? categoryPosts[i + 1] : null;
    });

    posts.push(...categoryPosts);
  }

  // 2단계: 실제 HTML 파일 생성
  for (const p of posts) {
    const postHtmlPath = path.join(POSTS_OUT, `${p.slug}.html`);
    await fs.writeFile(
      postHtmlPath,
      postPageTemplate({
        title: p.title,
        category: p.category,
        bodyHtml: p.bodyHtml,
        prev: p.prev,
        next: p.next,
      }),
      "utf-8"
    );
  }

  await fs.writeFile(
    path.join(DOCS_OUT, "posts.json"),
    JSON.stringify(
      posts.map(({ slug, title, excerpt, category }) => ({
        slug,
        title,
        excerpt,
        category,
      })),
      null,
      2
    ),
    "utf-8"
  );

  await fs.writeFile(path.join(DOCS_OUT, "index.html"), indexPageTemplate(), "utf-8");

  // 정적 자산(css/js) 복사
  await fs.mkdir(ASSETS_SRC, { recursive: true });
  const styleSrc = path.join(ASSETS_SRC, "style.css");
  const appSrc = path.join(ASSETS_SRC, "app.js");
  await fs.copyFile(styleSrc, path.join(DOCS_OUT, "style.css"));
  await fs.copyFile(appSrc, path.join(DOCS_OUT, "app.js"));

  console.log(`완료: ${posts.length}개의 글을 빌드했습니다.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
