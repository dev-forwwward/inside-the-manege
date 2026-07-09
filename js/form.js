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
                ...
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
                    youremail: `${errorIcon} Invalid email`,
                    yourname: "Invalid name",
                    consent: `${errorIcon} You must agree before joining`
                },
                errorPlacement: function (error, element) {
                    // Find the field wrapper using jQuery
                    const fieldWrapper = element.closest('.form8_field-wrapper');

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