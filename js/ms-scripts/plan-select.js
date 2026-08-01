// Select-then-continue card pattern, shared by /plans (plan price) and /gift/purchase (gift
// amount): each card's [data-plan-select] button just toggles which option is highlighted; the
// actual Memberstack action lives only on the single [data-plan-continue] button, whose attribute
// value this script keeps pointed at whichever option is currently selected. Which Memberstack
// attribute to drive is read off the continue button itself (data-ms-attr, e.g. "price:update"
// for a plan checkout vs "price:add" for a gift amount) — defaults to "price:update" for /plans,
// which doesn't need to set it explicitly.

export function planSelect() {
    const buttons = document.querySelectorAll('[data-plan-select]');
    const continueBtn = document.querySelector('[data-plan-continue]');
    if (!buttons.length || !continueBtn) return;

    const msAttr = continueBtn.getAttribute('data-ms-attr') || 'price:update';

    function selectButton(btn) {
        buttons.forEach((b) => {
            b.classList.remove('is-selected');
            const label = b.querySelector('[data-select-label]');
            if (label) label.textContent = 'Select';
        });

        btn.classList.add('is-selected');
        const selectedLabel = btn.querySelector('[data-select-label]');
        if (selectedLabel) selectedLabel.textContent = 'Selected';

        continueBtn.setAttribute('data-ms-' + msAttr, btn.getAttribute('data-price-id'));
    }

    buttons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            selectButton(btn);
        });
    });

    // Middle card (the recommended plan) is pre-selected on load.
    const defaultBtn = buttons[Math.floor(buttons.length / 2)];
    if (defaultBtn) selectButton(defaultBtn);

    console.log('Loading planSelect()');
}
