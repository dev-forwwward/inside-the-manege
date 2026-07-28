// Memberstack Data Table: video_progress — per-member Vimeo watch position/percent, keyed by
// lesson embed URL. Create this table by hand in the Memberstack dashboard (Data Tables aren't
// reachable from the client API used here):
//
//   Fields:   lessonKey (TEXT, required) courseSlug (TEXT) courseName (TEXT) lessonName (TEXT)
//             thumbnail (TEXT) seconds (NUMBER) duration (NUMBER) percent (NUMBER)
//             completed (BOOLEAN) lastWatchedAt (DATE)
//   Access:   create MEMBERS_ONLY, read/update/delete MEMBER_OWNER — same shape as `favorites`.
//
// Memberstack lowercases a field's Key regardless of the Name typed in when creating it (e.g.
// "lessonKey" -> key "lessonkey"), so every property written/read below uses the lowercase key,
// not the camelCase name shown in the dashboard.
//
// Lesson-level saves ("My List" for individual videos) reuse the existing `favorites` table
// instead of a second table — see the save button markup in course.lessons.js.

const PROGRESS_TABLE = 'video_progress';
const FAVORITES_TABLE = 'favorites';
const WRITE_INTERVAL_MS = 15000; // stays well under the Data Table write rate limit
const COMPLETE_THRESHOLD = 0.97;
const PAGE_SIZE = 100;

// Course-item favorite records use a Webflow Mongo ObjectId as `item`; lesson records use the
// lesson's embed URL — this tells the two apart without a dedicated schema field.
const isCourseCmsId = (value) => /^[0-9a-f]{24}$/i.test(value || '');

// Data Table records are member-writable (a member could hit the Memberstack API directly), so
// course/lesson names and thumbnail URLs get escaped before landing in innerHTML — same trust
// boundary as any other member-supplied field, even though today's values only ever originate
// from CMS content.
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds || 0));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function vimeoIdFromUrl(url) {
    return /player\.vimeo\.com\/video\/\d+/.test(url || '') ? true : false;
}

// Converts a player embed URL (player.vimeo.com/video/ID?h=HASH) into the vimeo.com/ID/HASH
// form Vimeo's oEmbed endpoint expects — the ?h= hash is required for unlisted videos.
function vimeoWatchUrlFromEmbed(url) {
    const match = /player\.vimeo\.com\/video\/(\d+)(?:\?h=([a-f0-9]+))?/.exec(url || '');
    if (!match) return null;
    const [, id, hash] = match;
    return hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`;
}

// Per-lesson thumbnail cache (a still frame of that specific video, from Vimeo's oEmbed API) —
// keyed by lessonKey so repeated saveProgress() calls for the same lesson don't refetch.
const vimeoThumbnailCache = {};

async function fetchVimeoThumbnail(key) {
    if (key in vimeoThumbnailCache) return vimeoThumbnailCache[key];
    const watchUrl = vimeoWatchUrlFromEmbed(key);
    if (!watchUrl) { vimeoThumbnailCache[key] = ''; return ''; }
    try {
        const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watchUrl)}`);
        const data = res.ok ? await res.json() : null;
        vimeoThumbnailCache[key] = data?.thumbnail_url || '';
    } catch (e) {
        vimeoThumbnailCache[key] = '';
    }
    return vimeoThumbnailCache[key];
}

function loadVimeoSdk() {
    if (window.Vimeo) return Promise.resolve();
    if (!window.__vimeoSdkPromise) {
        window.__vimeoSdkPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://player.vimeo.com/api/player.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return window.__vimeoSdkPromise;
}

// Client API uses flat query (where/take/skip), not findMany — mirrors favorites.js.
//
// `favorites` has a real `member` reference field, so filtering by it works. `video_progress`
// has no such field — per its schema comment up top, ownership is enforced by the table's
// MEMBER_OWNER read rule alone, and querying `where: { member: ... }` on it 400s with
// "Unknown field: member". Pass filterByMember: false for tables without that field.
async function fetchAllRecords(ms, table, memberId, { filterByMember = true } = {}) {
    const all = [];
    let skip = 0;
    let records;
    do {
        const page = await ms.queryDataRecords({
            table,
            query: {
                ...(filterByMember ? { where: { member: { equals: memberId } } } : {}),
                take: PAGE_SIZE,
                skip,
            },
        });
        records = page.data?.records || [];
        all.push(...records);
        skip += records.length;
    } while (records.length === PAGE_SIZE);
    return all;
}

// Memberstack's own script needs a moment after page load to hydrate the session from cookies —
// calling getCurrentMember() before that resolves can return null even for a logged-in member.
// Mirrors the waitForMemberstack() guard in the Favorites page's MemberScript #186.
function waitForMemberstackReady() {
    return new Promise((resolve) => {
        if (window.$memberstackDom && window.$memberstackReady) {
            resolve();
        } else {
            document.addEventListener('memberstack.ready', resolve, { once: true });
            setTimeout(resolve, 2000);
        }
    });
}

async function getMember(ms) {
    await waitForMemberstackReady();
    const res = await ms.getCurrentMember();
    return res && res.data ? res.data : null;
}

// ON COURSE TEMPLATE PAGE: attach a Vimeo Player to the active lesson, resume playback,
// throttle-write position/percent, and paint progress bars on the lesson list.
export async function videoProgressTracker() {

    const wrapper = document.querySelector('.video-lesson');
    if (!wrapper) return;

    const ms = window.$memberstackDom;
    const member = await getMember(ms);
    if (!member) return;

    let progressByKey = {};
    let player = null;
    let currentKey = null;
    let lastWriteTime = 0;
    let lastWrittenPercent = -1;

    function paintLessonProgress() {
        document.querySelectorAll('.videos-scroll .video-item').forEach((item) => {
            const key = item.getAttribute('data-video');
            const record = progressByKey[key];
            const track = item.querySelector('[data-progress-track]');
            const fill = item.querySelector('[data-progress-fill]');
            if (!record || record.data.completed || !track || !fill) return;
            fill.style.width = Math.min(record.data.percent, 100) + '%';
            track.style.display = 'block';
        });
    }

    async function saveProgress(seconds, duration, fraction) {
        if (!currentKey) return;

        const item = document.querySelector(`.videos-scroll .video-item[data-video="${CSS.escape(currentKey)}"]`);
        const payload = {
            lessonkey: currentKey,
            courseslug: window.location.pathname,
            coursename: $('#course-title').text().trim(),
            lessonname: item ? item.querySelector('.video-name div:last-child')?.textContent.trim() : '',
            // A still of this specific video, not the course cover — falls back to the course
            // image only if Vimeo's oEmbed lookup hasn't resolved yet or fails.
            thumbnail: vimeoThumbnailCache[currentKey] || $('.summary-img').attr('src') || '',
            seconds: Math.round(seconds || 0),
            duration: Math.round(duration || 0),
            percent: duration ? Math.round(fraction * 100) : 0,
            completed: fraction >= COMPLETE_THRESHOLD,
            lastwatchedat: new Date().toISOString(),
        };

        const existing = progressByKey[currentKey];
        if (existing) {
            await ms.updateDataRecord({ recordId: existing.id, data: payload });
            progressByKey[currentKey] = { id: existing.id, data: payload };
        } else {
            const created = await ms.createDataRecord({ table: PROGRESS_TABLE, data: payload });
            progressByKey[currentKey] = { id: created.data.id, data: payload };
        }
        paintLessonProgress();
    }

    async function attachPlayer(iframe, key) {
        currentKey = key;

        // YouTube-embedded lessons: no Vimeo Player.js hook available, skip tracking silently.
        if (!vimeoIdFromUrl(key)) { player = null; return; }

        fetchVimeoThumbnail(key); // warm the cache ahead of the first saveProgress() write

        await loadVimeoSdk();
        player = new Vimeo.Player(iframe);

        const existing = progressByKey[key];
        if (existing && !existing.data.completed && existing.data.seconds > 5) {
            player.ready().then(() => player.setCurrentTime(existing.data.seconds).catch(() => {}));
        }

        player.on('timeupdate', (data) => {
            const now = Date.now();
            if (now - lastWriteTime > WRITE_INTERVAL_MS && Math.abs(data.percent - lastWrittenPercent) > 0.02) {
                lastWriteTime = now;
                lastWrittenPercent = data.percent;
                saveProgress(data.seconds, data.duration, data.percent);
            }
        });

        player.on('pause', async () => {
            const seconds = await player.getCurrentTime();
            const duration = await player.getDuration();
            saveProgress(seconds, duration, duration ? seconds / duration : 0);
        });
    }

    document.addEventListener('lesson:changed', (e) => {
        const iframe = wrapper.querySelector('iframe');
        if (iframe) attachPlayer(iframe, e.detail.videoKey);
    });

    const records = await fetchAllRecords(ms, PROGRESS_TABLE, member.id, { filterByMember: false });
    records.forEach((r) => { progressByKey[r.data.lessonkey] = r; });
    paintLessonProgress();

    // If a lesson is already active on load (e.g. ?lesson= query param), attach to it too.
    const activeItem = document.querySelector('.videos-scroll .video-item.active');
    const iframe = wrapper.querySelector('iframe');
    if (activeItem && iframe && iframe.getAttribute('src')) {
        attachPlayer(iframe, activeItem.getAttribute('data-video'));
    }

    console.log('Loading videoProgressTracker');
}

// ON FAVORITES PAGE: in-progress (not completed) lessons, most recently watched first.
export async function renderContinueWatching() {
    const section = document.querySelector('[data-continue-watching-section]');
    const shelf = document.getElementById('continue-watching-shelf');
    if (!section || !shelf) return;

    const ms = window.$memberstackDom;
    const member = await getMember(ms);
    if (!member) { section.remove(); return; }

    const records = (await fetchAllRecords(ms, PROGRESS_TABLE, member.id, { filterByMember: false }))
        .filter((r) => !r.data.completed)
        .sort((a, b) => new Date(b.data.lastwatchedat) - new Date(a.data.lastwatchedat))
        .slice(0, 10);

    if (!records.length) { section.remove(); return; }

    shelf.innerHTML = records.map((r) => `
        <a href="${escapeHtml(r.data.courseslug)}?lesson=${encodeURIComponent(r.data.lessonname)}" class="continue-watching-card">
            <div class="continue-watching-thumb-wrap">
                <img src="${escapeHtml(r.data.thumbnail)}" alt="${escapeHtml(r.data.coursename)}">
                <span class="video-duration-badge">${formatDuration(r.data.duration)}</span>
                <div class="video-progress-track" style="display:block">
                    <div class="video-progress-fill" style="width:${Math.min(r.data.percent, 100)}%"></div>
                </div>
            </div>
            <p class="continue-watching-title">${escapeHtml(r.data.lessonname)}</p>
            <p class="continue-watching-subtitle">${escapeHtml(r.data.coursename)}</p>
        </a>
    `).join('');

    console.log('Loading renderContinueWatching');
}

// ON FAVORITES PAGE: individually saved (bookmarked) lessons, from the shared favorites table.
export async function renderSavedLessons() {
    const section = document.querySelector('[data-saved-lessons-section]');
    const shelf = document.getElementById('saved-lessons-shelf');
    if (!section || !shelf) return;

    const ms = window.$memberstackDom;
    const member = await getMember(ms);
    if (!member) { section.remove(); return; }

    const records = (await fetchAllRecords(ms, FAVORITES_TABLE, member.id)).filter((r) => {
        const item = (r.data.item && r.data.item.id) || r.data.item;
        return item && !isCourseCmsId(item);
    });

    if (!records.length) { section.remove(); return; }

    shelf.innerHTML = records.map((r) => {
        // `favorites` has no `item_name` field — the display label lives in `item_member` instead.
        const [name, courseSlug, thumb] = (r.data.item_member || '').split('|').map((s) => (s || '').trim());
        const href = escapeHtml(courseSlug || '#') + (name ? `?lesson=${encodeURIComponent(name)}` : '');
        return `
            <a href="${href}" class="saved-lesson-card">
                <div class="continue-watching-thumb-wrap">
                    <img src="${escapeHtml(thumb || '')}" alt="${escapeHtml(name || '')}">
                </div>
                <p class="continue-watching-title">${escapeHtml(name || 'Saved lesson')}</p>
            </a>
        `;
    }).join('');

    console.log('Loading renderSavedLessons');
}
