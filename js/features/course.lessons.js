import { addCurrentLessonToWatches } from '../ms-scripts/course-progress.js';

export function courseLessons() {

    $(document).ready(function(){

        let groups = {};
        let group_id = 0;
        let currentGroup = [];
        let group_titles = [];

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


                videos_html +=

                    `<div class="video-item" data-lesson="${url}" data-video="${video.trim()}">
                        <div class="video-name">
                            <img src="https://assets.website-files.com/635559e58d9051b6e2d9ae12/635ab0284ef7ab0eaae31fb7_5e41e923b6863614638cdd3b_course-lesson-white.svg" loading="lazy" alt="" class="play-icon" />
                            <div>${name}</div>
                        </div>
                        <div class="video-duration"><div>${duration}</div></div>
                    </div>`;
                ;

            });

            let gname = group_titles[key-1];

            group_html +=`
                <div class="video-group">
                    <div class="videos-group-title">${gname}</div>
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
        $(".video-lesson iframe").attr("src", $(this).attr("data-video"));


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
