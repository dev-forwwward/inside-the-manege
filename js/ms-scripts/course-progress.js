// Memberstack: course completion tracking (getMemberJSON / updateMemberJSON)

// ON PAGE LOAD, GET CURRENT COURSE COMPLETITION RATE
export async function courseProgress() {

    if ( !$(".videos-scroll .video-item").length ) {return;}

    let json = await window.$memberstackDom.getMemberJSON(member => {});
    let currentLessons = [];

    if (json.data) {
        let name = $("#course-title").text().trim();
        console.log(json.data, name);
        currentLessons = json.data[name] ?? [];
    }

    let total = currentLessons.length;

    let complete = total / $(".videos-scroll .video-item").length;
    complete = complete * 100;
    complete = complete.toFixed(2);

    $("#percentage-done").text(complete);
    $(".lessons-done").text(total);
    $(".progress-bar-inside").css("width", `${complete}%`);


    let title = $("#course-title").text();
    let arr = json.data[title];

    if ( arr.length ) {
        $(".video-item").each(function(){
            let v = $(this).attr("data-video");
            if ( arr.includes(v) ) {
                $(this).find(".play-icon").attr("src", "https://uploads-ssl.webflow.com/635559e58d9051b6e2d9ae12/63609bfb701e5fb42287ac3a_check-circle-fill.svg");
            }
        });
    }


    console.log( "json", json.data[title] );

}


// FUNCTION THAT ADDS VIDEO TO WATCHED IN CURRENT COURSE
export async function addCurrentLessonToWatches() {

    if ( !$(".videos-scroll .video-item").length ) {return;}


    let json = await window.$memberstackDom.getMemberJSON(member => {});
    console.log("JSON", json);

    let userData = json.data;


    if (userData) {

        let metadata = userData;

        console.log("metadata at start", metadata);


        let course_name = $("#course-title").text().trim();

        if ( !metadata[course_name] ) {
            metadata[course_name] = [];
        }



        let lesson_url = $(".video-item.active").attr("data-video");

        console.log("metadata before filter", lesson_url, metadata, metadata[course_name]);

        // remove this lesson from list, so we dont duplicate it
        metadata[course_name] = metadata[course_name].filter(currentLesson => currentLesson != lesson_url);


        console.log("metadata after filter", metadata, metadata[course_name]);



        //add this lesson to course
        metadata[course_name] = [lesson_url, ... metadata[course_name] ];

        console.log("metadata after add",  lesson_url, metadata );



        // UPDATE JSON OF MEMBERSTACK
        window.$memberstackDom.updateMemberJSON({
            json: metadata
        });


    }


}
