(function () {
  const inPostPage = location.pathname.includes("/posts/");
  const postsJsonPath = inPostPage ? "../posts.json" : "posts.json";
  const postLinkPrefix = inPostPage ? "" : "posts/";

  fetch(postsJsonPath)
    .then((res) => res.json())
    .then((posts) => {
      const categories = Array.from(new Set(posts.map((p) => p.category)));
      renderCategorySidebar(categories);

      const postListEl = document.getElementById("post-list");
      if (postListEl) {
        renderPostList(postListEl, posts, postLinkPrefix);
        wireCategoryFilter(postListEl, posts, postLinkPrefix);
      }
    })
    .catch(() => {
      const el = document.getElementById("category-list");
      if (el) el.innerHTML = '<li class="empty-state">카테고리를 불러오지 못했습니다.</li>';
    });

  function renderCategorySidebar(categories) {
    const el = document.getElementById("category-list");
    if (!el) return;
    if (categories.length === 0) {
      el.innerHTML = '<li class="empty-state">아직 카테고리가 없습니다.</li>';
      return;
    }
    el.innerHTML =
      `<li><button data-category="__all__" class="active">전체</button></li>` +
      categories
        .map(
          (c) =>
            `<li><button data-category="${escapeAttr(c)}">${escapeHtml(c)}</button></li>`
        )
        .join("");
  }

  function renderPostList(el, posts, prefix) {
    if (posts.length === 0) {
      el.innerHTML = '<li class="empty-state">아직 글이 없습니다.</li>';
      return;
    }
    el.innerHTML = posts
      .map(
        (p) => `
      <li data-category="${escapeAttr(p.category)}">
        <span class="post-item-category">${escapeHtml(p.category)}</span>
        <div>
          <a href="${prefix}${p.slug}.html">${escapeHtml(p.title)}</a>
        </div>
        <p class="post-item-excerpt">${escapeHtml(p.excerpt)}</p>
      </li>`
      )
      .join("");
  }

  function wireCategoryFilter(postListEl, posts, prefix) {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-category]");
      if (!btn || !document.getElementById("category-list").contains(btn)) return;

      document
        .querySelectorAll("#category-list button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const selected = btn.dataset.category;
      const filtered =
        selected === "__all__" ? posts : posts.filter((p) => p.category === selected);
      renderPostList(postListEl, filtered, prefix);
    });
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }
})();
