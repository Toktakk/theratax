export function suggestCategory(categories, note) {
    const lowered = note.toLowerCase();
    if (lowered.trim() === '') {
        return null;
    }
    for (const category of categories) {
        for (const keyword of category.keywords) {
            if (keyword !== '' && lowered.includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    return null;
}
