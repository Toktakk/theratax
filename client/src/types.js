export function asReadyUser(user) {
    if (user.onboardedAt === null ||
        user.practiceType === null ||
        user.expenseMethod === null) {
        return null;
    }
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        practiceType: user.practiceType,
        expenseMethod: user.expenseMethod,
        onboardedAt: user.onboardedAt,
    };
}
