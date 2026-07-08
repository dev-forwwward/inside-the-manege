export function mainInit() {

    // LENIS
    window.lenis = new Lenis(); // globally available

    // Sync Lenis scrolling with ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Add Lenis's requestAnimationFrame (raf) method to GSAP's ticker
    // This ensures Lenis's smooth scroll animation updates on each GSAP tick
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    // Disable lag smoothing in GSAP to prevent any delay in scroll animations
    gsap.ticker.lagSmoothing(0);

    // FANCYBOX INIT
    const fancyboxEl = document.querySelector("[data-fancybox]");
    if (fancyboxEl) {
        Fancybox.bind("[data-fancybox]", {
            on: {
                init: () => {
                    lenis.stop();
                },
                close: () => {
                    lenis.start();
                }
            }
        });
    }


    gsap.to('.preloader', {
        opacity: 0,
        delay: .1,
        duration: .5,
        ease: "power2.out",
        onComplete: ()=> {
            document.querySelector('.preloader').remove();
        }
    });

    // Copy link share
    const copyShare = document.querySelectorAll(".copy-to-clipboard");
    copyShare?.forEach(shareBtn => {
        shareBtn.addEventListener("click", function (e) {
            e.preventDefault();
            let tooltip = shareBtn.querySelector(".tooltip");
            tooltip?.classList.add("show");
            setTimeout(() => {
                tooltip?.classList.remove("show");
            }, 1500);
            navigator.clipboard.writeText(location.href);
        });
    });

    console.log("Loading mainInit()");

}