export function userCreditedTaskWhere(userId: string) {
  return {
    OR: [
      { assigneeId: userId },
      { assigneeId: null, creatorId: userId },
    ],
  };
}
