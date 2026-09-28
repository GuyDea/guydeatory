/** Marks the table-of-contents entry for the section currently being read. */
const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')];
const targets = links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter((el) => el !== null);

if (targets.length > 0 && 'IntersectionObserver' in window) {
  const visible = new Set<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      const current = targets.find((el) => visible.has(el));
      if (!current) return;
      for (const link of links) {
        if (decodeURIComponent(link.hash.slice(1)) === current.id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-80px 0px -60% 0px' },
  );
  for (const target of targets) observer.observe(target);
}
