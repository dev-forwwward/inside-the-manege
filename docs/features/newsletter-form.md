# Newsletter form validation

**File:** `js/form.js` (export: `form`)

## What it does

Runs only when `.newsletter_form-block` is present on the page. Applies jQuery Validate to every `<form>`:

- Custom `letters` rule (letters/whitespace only) and `customEmail` rule (stricter email regex than the plugin default) registered as jQuery Validate methods.
- Validates `yourname` (required), `youremail` (required + `email` + `customEmail`), `consent` (required).
- Native HTML5 validation is disabled (`novalidate`) in favor of the plugin's own handling.
- Error messages are custom strings, some prefixed with an inline SVG error icon.
- Custom `errorPlacement`: looks for the field's `.row-wrapper` ancestor and appends the error into its `.label-error-wrapper` if present (adding a `show` class after a 200ms delay, presumably to let a CSS transition catch it), falling back to inserting the error directly after the field.
