export function swiperInit() {

    console.log("running swiper.js");

    // Init Homepage Works Swiper
    let hpWorksSwiper = document.querySelector('.is-slider-instructors');
    const hpWorkSwiperSlides = document.querySelectorAll('.swiper-slide');

    if (hpWorksSwiper && hpWorkSwiperSlides) {

        setTimeout(() => {
            hpWorksSwiper = new Swiper('.is-slider-instructors', {
                slidesPerView: 1.25,
                spaceBetween: 16,
                //centeredSlides: true,
                direction: 'horizontal',
                loop: true,
                autoWidth: true,
                speed: 1000,
                // autoplay: {
                //     delay: 1800,
                //     disableOnInteraction: false,
                // },

                freeMode: true,
                freeModeMomentum: false,
                allowTouchMove: true,

                breakpoints: {
                    // for screens 500px wide and up
                    500: {
                        slidesPerView: 2.25,
                    },
                    // for screens 768px wide and up
                    768: {
                        slidesPerView: 3.25,
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