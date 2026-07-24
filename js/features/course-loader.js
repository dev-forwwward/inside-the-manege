// Page-specific loader for course/lesson pages — NOT part of js/script-loader.js's
// site-wide bundle. Paste the matching <script type="module"> tag (see below) into
// the Webflow custom code of pages that render .videos-scroll / [data-favorite-button].
//
// <script type="module" src="https://cdn.jsdelivr.net/gh/dev-forwwward/inside-the-manege@main/js/features/course-loader.js?v=DATE_NOW_HERE"></script>

const v = Date.now();
const [
    { courseLessons },
    { courseProgress },
    { favorites },
] = await Promise.all([
    import(`./course.lessons.js?v=${v}`),
    import(`../ms-scripts/course-progress.js?v=${v}`),
    import(`../ms-scripts/favorites.js?v=${v}`),
]);

courseLessons();
courseProgress();
favorites();

console.log("Loading course-loader");
