import { usersApi, keysApi } from './api';

export async function getAllUsersWithKeyCount() {
  // Fetch all users
  const res = await usersApi.getAllUsers();
  const users = res.data.users || res.data || [];
  // For each user, fetch their key count
  const usersWithKeyCount = await Promise.all(
    users.map(async (u: any) => {
      let keyCount = 0;
      try {
        // Fetch all keys assigned to this user, regardless of status
        const keysRes = await keysApi.getUserKeys(u._id || u.uid);
        // If your API supports filtering by status, remove it or ensure it fetches all
        const keysArr = Array.isArray(keysRes.data?.keys) ? keysRes.data.keys : [];
        keyCount = keysArr.length;
      } catch {
        keyCount = 0;
      }
      return { ...u, keyCount };
    })
  );
  return usersWithKeyCount;
}
