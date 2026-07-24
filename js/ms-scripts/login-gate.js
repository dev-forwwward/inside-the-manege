// Memberstack: gate /courses/ links behind login, redirect logged-in members to first lesson.
// Disabled/unused — kept commented for reference, not wired into any loader.

// if user tries to go to courses, check if he is logged in first. If not, shop signup modal.
/*
$(document).on('click','a[href]',function(e){

    let x = $(this).attr("href");
    if ( x.includes("/courses/") ) {

      e.preventDefault();

      login_check_a_href(x);

    }

});


// if user is logged in, redirect him to first premium lesson
async function login_check_a_href(link) {

    let user = await window.$memberstackDom.getCurrentMember(member => {});
    if ( !user.data ) {
        $(".sign-up__popup").css("display", "block");
        $(".sign-up__popup").css("opacity", "1");
    } else {
        window.location.href = link;
    }

}
*/
