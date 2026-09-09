Photos for the "Who we work with" cards on the homepage.

Three files go here, 16:9, around 1200x675:

  plumbing.jpg
  hvac.jpg
  moving-storage.jpg

They are referenced from index.html with width/height already set, so the
cards hold their shape and the page does not shift when the files land.
Alt text is already written in the markup - update it if the photo you drop
in shows something different.

Note the capital A in Assets/. This Mac's filesystem is case-insensitive so
"assets/verticals/..." resolves to the same folder locally, but Vercel serves
from Linux, where it does not - a lowercase path would work on your machine
and 404 in production.

Cards 4-6 (Roofing, Restoration, Insurance) take no photo. They carry an
inline outline mark instead, in the same 16:9 box with the same hairline.
That is the finished treatment, not a gap waiting on a file.
