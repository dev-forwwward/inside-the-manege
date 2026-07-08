export function swiperInit() {

    console.log("running swiper.js");

    // Init Homepage Works Swiper
    let hpWorksSwiper = document.querySelector('.hp_works_swiper');
    const hpWorkSwiperSlides = document.querySelectorAll('.hp_works_slide');

    if (hpWorksSwiper && hpWorkSwiperSlides) {

        setTimeout(() => {
            hpWorksSwiper = new Swiper('.hp_works_swiper', {
                slidesPerView: 1.8,
                spaceBetween: 16,
                centeredSlides: true,
                direction: 'horizontal',
                loop: true,
                autoWidth: true,
                speed: 1000,
                autoplay: {
                    delay: 1800,
                    disableOnInteraction: false,
                },

                freeMode: true,
                freeModeMomentum: false,
                allowTouchMove: true,

                breakpoints: {
                    // for screens 768px wide and up
                    768: {
                        autoplay: {
                            delay: 0,
                            disableOnInteraction: false, // if true, will pause on hover
                        },
                        slidesPerView: 6,
                        spaceBetween: 32,
                        speed: 8000, // Smooth transition speed
                        centeredSlides: false,
                        freeMode: true,
                        freeModeMomentum: false,
                    }
                },
                on: {
                    init: function () {
                        console.log('Swiper initialized');

                        // add mouse hover listener to all slides
                        // update swiper measurements with each hover (since they expand on hover)
                        hpWorkSwiperSlides.forEach((slide) => {
                            slide.addEventListener('mouseenter', () => {
                                hpWorksSwiper.update();
                                // hpWorksSwiper.autoplay.stop();
                            });
                            slide.addEventListener('mouseleave', () => {
                                hpWorksSwiper.update();
                                // hpWorksSwiper.autoplay.start();
                            });
                        });
                    },
                }
            });

            window.addEventListener('resize', () => { hpWorksSwiper.update(); });

        }, 800);

    }

    console.log("running swiperInit()");

}