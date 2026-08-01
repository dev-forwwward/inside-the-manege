// Pricing table on /plans: replaces the old "click a card, checkout starts immediately" pattern
// with select-then-confirm. Each card's [data-plan-select] button just toggles which plan is
// highlighted; the actual Memberstack checkout trigger (data-ms-price:update) lives only on the
// single [data-plan-continue] button, whose attribute value this script keeps pointed at
// whichever plan is currently selected.

export function planSelect() {
    const buttons = document.querySelectorAll('[data-plan-select]');
    const continueBtn = document.querySelector('[data-plan-continue]');
    if (!buttons.length || !continueBtn) return;

    function selectButton(btn) {
        buttons.forEach((b) => {
            b.classList.remove('is-selected');
            const label = b.querySelector('p');
            if (label) label.textContent = 'Select';
        });

        btn.classList.add('is-selected');
        const selectedLabel = btn.querySelector('p');
        if (selectedLabel) selectedLabel.textContent = 'Selected';

        continueBtn.setAttribute('data-ms-price:update', btn.getAttribute('data-price-id'));
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
