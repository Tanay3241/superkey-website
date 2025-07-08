const { db } = require('../config/firebase');

/**
 * Logs a key transaction to /keyTransactions collection
 * @param {Object} params
 * @param {Array<string>} params.keyIds - IDs of the keys affected
 * @param {string|null} params.fromUser - sender UID (or null if system-generated)
 * @param {string|null} params.toUser - recipient UID (or null if revoked)
 * @param {string} params.action - "created" | "credited" | "revoked" | "provisioned"
 * @param {string} params.performedBy - UID of the actor (usually same as fromUser or admin)
 * @param {string} [params.fromRole]
 * @param {string} [params.toRole]
 * @param {string} [params.reason]
 */
const logKeyTransaction = async ({
  keyIds = [],
  fromUser,
  toUser,
  action,
  performedBy,
  fromRole,
  toRole,
  participants,
  reason = ''
}) => {
  const timestamp = new Date();

  const txRef = db.collection('keyTransactions').doc();
  await txRef.set({
    keyIds, // store the array of key IDs
    fromUser: fromUser || null,
    toUser: toUser || null,
    fromRole: fromRole || null,
    toRole: toRole || null,
    action,
    performedBy,
    participants,
    reason,
    timestamp
  });
};

module.exports = logKeyTransaction;