// MEMBERSCRIPT #215 v0.1 - Favorites / saved items (Memberstack Data Tables)

export function favorites() {

    // ─── CONFIG: customize these to match your design ─────────────────────────
    const CONFIG = {
        tableName: 'favorites',
        pageSize: 100, // API max per request (1–100); we use cursor to fetch all
        savedColor: '#c96442',
        favoritesListItemSelector: '.w-dyn-item',
        countLabelSingular: 'Item',
        countLabelPlural: 'Items'
    };
    document.documentElement.style.setProperty('--ms215-saved-color', CONFIG.savedColor);
    // ─────────────────────────────────────────────────────────────────────────

    const getMS = async () => window.$memberstackDom || null;

    const buttons = document.querySelectorAll("[data-favorite-button]");
    const favoritesList = document.querySelector("[data-favorites-list]");
    const emptyState = document.querySelector("[data-empty-state]");
    const countDisplay = document.querySelector("[data-fav-count]");

    // Client API uses flat query (where, take, skip) — not findMany
    const fetchAllFavorites = async (ms, memberId) => {
        const all = [];
        let skip = 0;
        let records;
        do {
            const page = await ms.queryDataRecords({
                table: CONFIG.tableName,
                query: {
                    where: { member: { equals: memberId } },
                    take: CONFIG.pageSize,
                    skip
                }
            });
            records = page.data?.records || [];
            all.push(...records);
            skip += records.length;
        } while (records.length === CONFIG.pageSize);
        return all;
    };

    const getItemId = (record) => {
        const item = record.data && record.data.item;
        return item && (item.id || item);
    };

    // [data-favorites-list] = saved-only list (hearts filled). [data-favorites-list-all] = full list (hearts fill when saved).

    // Set every button's saved state from one list of records (no extra API calls)
    const updateButtonStates = (records) => {
        const itemToRecord = new Map();
        records.forEach((r) => {
            const id = getItemId(r);
            if (id) itemToRecord.set(id, r.id);
        });
        buttons.forEach((button) => {
            const itemId = button.getAttribute('data-item-id');
            const recordId = itemToRecord.get(itemId) || null;
            button._msRecordId = recordId;
            button.classList.remove('is-saved');
            if (recordId) button.classList.add('is-saved');
        });
    };

    const renderList = (records) => {
        if (!favoritesList) return;

        const savedIds = new Set(records.map(getItemId).filter(Boolean));

        if (countDisplay) {
            const n = records.length;
            countDisplay.textContent = n === 1
                ? '1 ' + CONFIG.countLabelSingular
                : n + ' ' + CONFIG.countLabelPlural;
        }

        const listWrapper = favoritesList.querySelector('.w-dyn-list, [role="list"]');
        const emptyList = records.length === 0;

        if (emptyState) emptyState.style.display = emptyList ? 'block' : 'none';
        if (listWrapper) listWrapper.style.display = emptyList ? 'none' : '';

        if (emptyList) return;

        const buttonsInFavoritesList = favoritesList.querySelectorAll('[data-favorite-button]');
        buttonsInFavoritesList.forEach((btn) => {
            const itemId = btn.getAttribute('data-item-id');
            const listItem = btn.closest(CONFIG.favoritesListItemSelector);
            if (listItem) listItem.style.display = savedIds.has(itemId) ? '' : 'none';
        });
    };

    const refreshList = async () => {
        if (!favoritesList) return;
        const ms = await getMS();
        if (!ms) return;
        const member = (await ms.getCurrentMember()).data;
        if (!member) return;

        try {
            const records = await fetchAllFavorites(ms, member.id);
            renderList(records);
            updateButtonStates(records);
        } catch (err) { console.error(err); }
    };

    buttons.forEach((button) => {
        const itemId = button.getAttribute('data-item-id');
        const itemName = button.getAttribute('data-item-name');

        button.addEventListener('click', async () => {
            const ms = await getMS();
            const member = (await ms.getCurrentMember()).data;
            if (!member) return;

            const recordId = button._msRecordId;

            if (recordId) {
                await ms.deleteDataRecord({ recordId });
                button._msRecordId = null;
                document.querySelectorAll(`[data-favorite-button][data-item-id="${itemId}"]`).forEach((b) => {
                    b._msRecordId = null;
                    b.classList.remove('is-saved');
                });
            } else {
                // `favorites` table has no `item_name` field — its key is locked to `item_member`
                // (created under that name before this field got repurposed for display labels).
                const data = { item_member: itemName, member: member.id };
                let res;
                try { res = await ms.createDataRecord({ table: CONFIG.tableName, data: { ...data, item: itemId } }); }
                catch (e) { res = await ms.createDataRecord({ table: CONFIG.tableName, data: { ...data, item: { id: itemId } } }); }
                const newId = res.data.id;
                document.querySelectorAll(`[data-favorite-button][data-item-id="${itemId}"]`).forEach((b) => {
                    b._msRecordId = newId;
                    b.classList.add('is-saved');
                });
            }
            await refreshList();
        });
    });

    refreshList();
}
