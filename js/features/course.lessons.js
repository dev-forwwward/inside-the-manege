import { addCurrentLessonToWatches } from '../ms-scripts/course-progress.js';

// Escapes text dropped into innerHTML via a template-literal string — lesson/group titles and
// durations come from CMS rich text, which isn't otherwise sanitized before this, so a crafted
// title could break out of its tag (stored HTML injection) without this.
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function courseLessons() {

    $(document).ready(function(){

        let groups = {};
        let group_id = 0;
        let currentGroup = [];
        let group_titles = [];

        // Denormalized onto every lesson row's save button so favorites.js (unmodified) can
        // bookmark individual lessons in the same `favorites` table used for whole-course saves.
        const courseSlug = window.location.pathname;
        const courseThumbnail = $('.summary-img').attr('src') || '';

        $('.rich-groups-videos > *').each(function(){


            /* Find Group Start */
            if($(this).text() === '{{group_start}}')
            {
                group_id++;
                groups[group_id] = [];
                currentGroup = [];
            }
            /* Find Group End */
            else if($(this).text() === '{{group_end}}')
            {

                groups[group_id] = currentGroup;
            }

            /* Find Title */
            else if( $(this).text().includes("group:") )
            {
                let group_name = $(this).text().replace("group:","");
                group_titles.push(group_name);
            }

            /* Find InBetween */
            else
            {

                let c = $(this).text();
                c = c.split("|");

                if ( c.length > 1 ) {
                    currentGroup.push(c);
                }

            }

        });



        let group_html = "";

        Object.keys(groups).forEach(function(key) {

            let group = groups[key];


            let videos_html = "";

            Object.keys(group).forEach(function(key) {


                let video_item = group[key];

                let name = video_item[0];
                let video = video_item[1];
                let duration = video_item[2];

                let url = encodeURI(name);
                let videoUrl = video.trim();
                // Prefixed with the course path because stock/demo lesson videos can be the exact
                // same URL across two different courses — a bare video URL would let progress on
                // one course's lesson collide with another's. data-video stays the raw playable
                // URL (iframe src); data-lesson-key is what progress tracking and saves key off.
                let lessonKey = `${courseSlug}::${videoUrl}`;
                // `item_name`'s pipe-delimited encoding mirrors this file's own rich-text lesson
                // format — the `favorites` table has no dedicated columns for a lesson's course
                // link/thumbnail, so the shelf on the Favorites page splits this back apart.
                let itemName = `${name} | ${courseSlug} | ${courseThumbnail}`;


                videos_html +=

                    `<div class="video-item" data-lesson="${escapeHtml(url)}" data-video="${escapeHtml(videoUrl)}" data-lesson-key="${escapeHtml(lessonKey)}">
                        <div class="video-name">
                            <img src="https://assets.website-files.com/635559e58d9051b6e2d9ae12/635ab0284ef7ab0eaae31fb7_5e41e923b6863614638cdd3b_course-lesson-white.svg" loading="lazy" alt="" class="play-icon" />
                            <div>${escapeHtml(name)}</div>
                        </div>
                        <div class="video-progress-track" data-progress-track style="display:none">
                            <div class="video-progress-fill" data-progress-fill></div>
                        </div>
                        <button type="button" class="video-save-btn favorite_button" data-favorite-button data-item-id="${escapeHtml(lessonKey)}" data-item-name="${escapeHtml(itemName)}" aria-label="Save lesson" onclick="event.stopPropagation()">
                            <svg class="favorite_icon video-save-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
                        </button>
                        <div class="video-duration"><div>${escapeHtml(duration)}</div></div>
                    </div>`;
                ;

            });

            let gname = group_titles[key-1];

            group_html +=`
                <div class="video-group">
                    <div class="videos-group-title">${escapeHtml(gname)}</div>
                    <div class="video-items">
                       ${videos_html}
                    </div>
                </div>
            `;


        });




        $(".videos-scroll").html(group_html);

    });


    // ON VIDEO CLICK

    $(document).on('click','.videos-scroll .video-item',function(){


        //show video, hide preview
        $(".video-wrapper").removeClass("grid2");
        $(".preview-course").hide();
        $(".video-lesson").show();
        $(".course-wrapper").hide();
        $(".video-list").removeClass("full");
        $(".breadcrumbs.b-lessons").css("display","flex");
        $(".section.lesson").css("display", "block");


        // SET ACTIVE CLASS OF EPSIODE
        $(".videos-scroll .video-item").removeClass("active");
        $(this).addClass("active");

        // SHOW VIDEO OF EPISODE
        let activeVideoUrl = $(this).attr("data-video");
        let activeLessonKey = $(this).attr("data-lesson-key");
        $(".video-lesson iframe").attr("src", activeVideoUrl);

        // Lets video-progress.js (re)attach a Vimeo Player instance to the swapped iframe.
        document.dispatchEvent(new CustomEvent("lesson:changed", { detail: { videoUrl: activeVideoUrl, lessonKey: activeLessonKey } }));


        // CHANGE URL
        var href = new URL(window.location.href);
        href.searchParams.set('lesson', $(this).attr("data-lesson").trim() );

        let newUrl = href.toString();
        history.pushState({}, null, newUrl);

        setTimeout(function(){
            addCurrentLessonToWatches();
        },20)


    });


    // ON PAGE LOAD - IF THERE IS A SPECIFIED EPISODE IN URL QUERY, SHOW THAT EPISODE

    $(document).ready(function(){

        var href = new URL(window.location.href);
        let lesson = href.searchParams.get("lesson")?.trim();


        if (lesson) {
            $(`.video-item[data-lesson='${lesson}']`).trigger("click");
            //show video, hide preview
            $(".video-wrapper").removeClass("grid2");
            $(".preview-course").hide();
            $(".video-lesson").show();
            $(".course-wrapper").hide();
            $(".video-list").removeClass("full");
            $(".breadcrumbs.b-lessons").show();
        }

    });

    $(document).on('click','.start-first-lesson',function(e){
        e.preventDefault();
        $('.videos-scroll .video-item').eq(0).trigger("click");
        setTimeout(function(){
            $('html, body').animate({
                scrollTop: $(".video-wrapper").offset().top - 200
            }, 1000);
        },100)

    });


    // SET TOTAL DURATION AND TOTAL LESSONS AMOUNT IN HTML

    window.addEventListener('load', function() {

        $(".course-lessons-count").text(  $(".videos-scroll .video-item").length );

        let duration = 0;
        $(".videos-scroll .video-item .video-duration").each(function(){
            let min = parseInt( $(this).text().trim() );
            duration+=min;
        });


        $(".course-time-count").text(  duration +"min");

    });

    console.log("Loading courseLessons()");
}
