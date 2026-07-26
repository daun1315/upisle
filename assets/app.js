const SPINE_COLORS = [
  'var(--spine-1)',
  'var(--spine-2)',
  'var(--spine-3)',
  'var(--spine-4)',
  'var(--spine-5)',
  'var(--spine-6)',
];

function colorForTitle(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}

async function renderShelf() {
  const shelf = document.getElementById('shelf');

  let books = [];
  try {
    const res = await fetch('books.json', { cache: 'no-store' });
    books = await res.json();
  } catch (err) {
    shelf.innerHTML = `<p class="empty-state">books.json을 불러오지 못했습니다.</p>`;
    return;
  }

  if (!Array.isArray(books) || books.length === 0) {
    shelf.innerHTML = `
      <p class="empty-state">
        아직 등록된 책이 없습니다.<br/>
        <code>epubs/</code> 폴더에 epub 파일을 넣고,
        <code>books.json</code>에 제목과 경로를 추가해 주세요.
      </p>`;
    return;
  }

  shelf.innerHTML = '';
  books.forEach((book) => {
    if (!book.file || !book.title) return;

    const spine = document.createElement('a');
    spine.className = 'spine';
    spine.style.setProperty('--spine-color', colorForTitle(book.title));
    spine.href = `reader.html?book=${encodeURIComponent(book.file)}&title=${encodeURIComponent(book.title)}`;
    spine.setAttribute('role', 'button');
    spine.setAttribute('aria-label', `${book.title} 열기`);

    spine.innerHTML = `
      <span class="spine-band"></span>
      <span class="spine-title">${book.title}${book.author ? ` · ${book.author}` : ''}</span>
      <span class="spine-band lower"></span>
    `;

    shelf.appendChild(spine);
  });
}

renderShelf();
