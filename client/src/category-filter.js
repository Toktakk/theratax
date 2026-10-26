export function categoriesForMethod(categories, expenseMethod) {
    return categories.filter((category) => {
        if (category.kind === 'general') {
            return true;
        }
        if (expenseMethod === 'flat_rate') {
            return category.kind === 'mileage';
        }
        return category.kind === 'vehicle_actual';
    });
}
export function categoryName(categories, slug) {
    const found = categories.find((category) => category.slug === slug);
    return found === undefined ? slug : found.name;
}
