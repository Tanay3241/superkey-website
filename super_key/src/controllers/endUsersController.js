const { admin, db, dbRT } = require('../config/firebase');
const { logKeyTransaction } = require('../utils');

// Default feature configuration
const DEFAULT_FEATURES = {
  apps: [],
  isAppBlocking: false,
  isAppInstallation: false,
  isCamera: true,
  isDeveloperOptions: true,
  isHardReset: false,
  isIncomingCalls: false,
  isLockEnable: true,
  isOutgoingCalls: true,
  isSetting: true,
  isSoftBoot: true,
  isSoftReset: false,
  isUSBDebug: true,
  passwordChange: 'changeme123',
  warningAudio: true,
  warningWallpaper: true
};

async function createEndUser(req, res) {
  try {
    // 1. Validate and extract input
    const {
      fullName,
      email,
      phoneNumber,
      deviceName,
      imei1,
      imei2,
      emi
    } = req.body;
    const retailerId = req.user && req.user.uid;

    if (!retailerId) {
      return res.status(401).json({ error: 'Unauthorized retailer' });
    }
    if (!fullName || !email || !phoneNumber || !imei1 || !imei2 || !emi || !deviceName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!emi || !emi.start_date || !emi.installments_left || !emi.monthly_installment || !emi.total_amount) {
      return res.status(400).json({ error: 'Missing required EMI fields' });
    }

    // 2. Validate retailer and key
    const retailerRef = db.collection('users').doc(retailerId);
    const retailerDoc = await retailerRef.get();
    if (!retailerDoc.exists) {
      return res.status(404).json({ error: 'Retailer not found' });
    }
    const keysSnap = await db.collection('keys')
      .where('assignedTo', '==', retailerId)
      .where('status', '==', 'credited')
      .limit(1)
      .get();

    if (keysSnap.empty) {
      return res.status(400).json({ error: 'No available keys to provision' });
    }

    const keyDoc = keysSnap.docs[0];
    const keyId = keyDoc.id;
    const keyRef = keyDoc.ref;
    const key = keyDoc.data();

    if (key.assignedTo !== retailerId || key.status !== 'credited') {
      return res.status(403).json({
        error: 'Key is not assigned to you or is already provisioned'
      });
    }

    // 3. Prepare Firestore and RTDB data
    const now = admin.firestore.Timestamp.now();
    const rtdbRef = dbRT.ref('users').push();
    const rtdbId = rtdbRef.key;
    const enduserRef = db.collection('endUsers').doc();
    const enduserId = enduserRef.id;
    const enduserData = {
      fullName,
      email,
      phoneNumber,
      deviceName,
      imei1,
      imei2,
      retailerId,
      keyId,
      rtdbId,
      registeredBy: retailerId,
      createdAt: now
    };
    const startDate = new Date(emi.start_date);
    const nextDate = new Date(startDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    const nextInstallmentDate = admin.firestore.Timestamp.fromDate(nextDate);
    const emiDoc = {
      ...emi,
      start_date: admin.firestore.Timestamp.fromDate(startDate),
      next_installment_date: admin.firestore.Timestamp.fromDate(nextInstallmentDate)
    };

    // 4. Firestore batch (atomic)
    const batch = db.batch();
    batch.set(enduserRef, enduserData);
    batch.set(enduserRef.collection('emi').doc(), emiDoc);
    batch.update(keyRef, {
      status: 'provisioned',
      provisionedAt: now,
      user_id: enduserId
    });
    batch.update(retailerRef, {
      'wallet.availableKeys': admin.firestore.FieldValue.increment(-1),
      'wallet.totalProvisioned': admin.firestore.FieldValue.increment(1)
    });
    await batch.commit();

    // 5. RTDB write (not atomic with Firestore)
    const retailerData = retailerDoc.data();
    const defaultRTDBPayload = {
      imei1,
      imei2,
      retailerId,
      uniqueKey: keyId,
      emi: {
        startDate: startDate.toISOString(),
        emiLeft: emi.installments_left,
        paymentAmount: emi.monthly_installment,
        totalAmount: emi.total_amount,
        downPayment: emi.down_payment || 0,
        totalAmountLeft: emi.amount_left,
        dueDate: nextInstallmentDate.toISOString(),
      },
      features: DEFAULT_FEATURES,
      getRecentContacts: '',
      location: { lat: 0, lng: 0 },
      retailer: {
        id: retailerId,
        phoneNumber: retailerData.phone,
        email: retailerData.email,
        shopName: retailerData.shopName || "Shop's name",
        qrUrl: retailerData.qrUrl || ''
      }
    };
    try {
      await rtdbRef.set(defaultRTDBPayload);
    } catch (rtdbError) {
      console.error('RTDB write error:', rtdbError);
      return res.status(500).json({ error: 'Provisioned in Firestore, but failed to write to RTDB. Please contact support.' });
    }

    // 6. Log provisioning transaction (not atomic)
    try {
      await logKeyTransaction({
        keyIds: [keyId],
        action: 'provisioned',
        fromUser: retailerId,
        toUser: enduserId,
        fromRole: 'retailer',
        toRole: 'end_user',
        participants: [retailerId, enduserId],
        performedBy: retailerId,
        reason: `Provisioned to user ${fullName}`
      });
    } catch (logError) {
      console.error('Transaction log error:', logError);
    }

    res.json({ success: true, message: 'EndUser created and device provisioned', enduserId, rtdbId });
  } catch (error) {
    console.error('EndUser creation error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createEndUser
};