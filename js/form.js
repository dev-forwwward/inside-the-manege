export function form() {

    // Form validation
    if (document.querySelector('.newsletter_form-block')) {
        $("form").each(function (e) {
            $.validator.addMethod("letters", function (value, element) {
                return this.optional(element) || value == value.match(/^[a-zA-Z\s]*$/);
            });
            $.validator.addMethod("customEmail", function (value, element) {
                return (
                    this.optional(element) || /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value)
                );
            });

            const errorIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7.00033 12.8333C10.222 12.8333 12.8337 10.2216 12.8337 6.99996C12.8337 3.7783 10.222 1.16663 7.00033 1.16663C3.77866 1.16663 1.16699 3.7783 1.16699 6.99996C1.16699 10.2216 3.77866 12.8333 7.00033 12.8333Z" stroke="#FF5959" stroke-width="1.02083" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 4.66663V6.99996" stroke="#FF5959" stroke-width="1.02083" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 9.33337H7.00583" stroke="#FF5959" stroke-width="1.02083" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;

            // Disable native HTML5 validation
            $(this).attr('novalidate', 'novalidate');
            $(this).validate({
                rules: {
                    yourname: {
                        required: true
                    },
                    youremail: {
                        required: true,
                        email: true,
                        customEmail: true, // Add the customEmail validation
                    },
                    consent: {
                        required: true
                    }
                },
                messages: {
                    youremail: `${errorIcon} Please enter a valid email address.`,
                    yourname: "Invalid name",
                    consent: `${errorIcon} You must agree to receive updates and to the Privacy Policy.`
                },
                errorPlacement: function (error, element) {
                    // Find the field wrapper using jQuery
                    const fieldWrapper = element.closest('.row-wrapper');

                    if (fieldWrapper.length) {
                        // Find the existing label-error-wrapper
                        const labelErrorWrapper = fieldWrapper.find('.label-error-wrapper');

                        if (labelErrorWrapper.length) {
                            // Append error to the existing wrapper
                            labelErrorWrapper.append(error);
                            setTimeout(() => {
                                error[0].classList.add("show");
                            }, 200);
                            return;
                        }
                    }

                    // Fallback to default behavior
                    error.insertAfter(element);
                    setTimeout(() => {
                        error[0].classList.add("show");
                    }, 200);
                },
            });
        });
    }

    console.log("Loading form()");
}