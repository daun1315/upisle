const params = new URLSearchParams(location.search);
const bookPath = params.get('book');
const bookTitle = params.get('title');

const titleEl = document.getElementById('reader-title');
const viewerEl = document.getElementById('viewer');

if (!bookPath) {
  viewerEl.innerHTML = `<p class="reader-status">열 책이 지정되지 않았습니다. 서재로 돌아가 주세요.</p>`;
} else {
  titleEl.textContent = bookTitle || '읽는 중…';

  const book = ePub(bookPath);
  const rendition = book.renderTo('viewer', {
    width: '100%',
    height: '100%',
    spread: 'auto',
  });

  rendition.display().catch(() => {
    viewerEl.innerHTML = `<p class="reader-status">이 책을 여는 데 실패했습니다. 파일 경로를 확인해 주세요: ${bookPath}</p>`;
  });

  document.getElementById('prev-btn').addEventListener('click', () => rendition.prev());
  document.getElementById('next-btn').addEventListener('click', () => rendition.next());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') rendition.prev();
    if (e.key === 'ArrowRight') rendition.next();
  });

  book.loaded.navigation.then(() => {
    if (!bookTitle && book.package && book.package.metadata) {
      titleEl.textContent = book.package.metadata.title || '제목 없음';
    }
  });
}
