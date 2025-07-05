const { db, admin } = require('../config/firebase');

async function payEMI(req, res) {
  try {
    const { endUserId, amount, method = "Cash" } = req.body;

    if (!endUserId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Missing or invalid inputs" });
    }

    const userRef = db.collection('endUsers').doc(endUserId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    if (!userDoc.exists || userData.registeredBy !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to pay EMI for this user' });
    }
    if (amount > emiData.amount_left) {
      return res.status(400).json({ error: 'Payment exceeds remaining amount' });
    }
    const emiSnap = await userRef.collection('emi')
      .orderBy('start_date', 'desc') // Assuming latest EMI record
      .limit(1)
      .get();

    if (emiSnap.empty) return res.status(404).json({ error: 'No EMI record found' });

    const emiDoc = emiSnap.docs[0];
    const emiData = emiDoc.data();

    if (emiData.installments_left <= 0) {
      return res.status(400).json({ error: 'EMI already fully paid' });
    }

    const now = admin.firestore.Timestamp.now();
    const nextDue = emiData.next_installment_date.toDate();
    const isLate = now.toDate() > nextDue;

    const newInstallments = emiData.installments_left - 1;
    const newAmountLeft = emiData.amount_left - amount;
    const newDue = admin.firestore.Timestamp.fromDate(new Date(
      nextDue.getTime() + 2592000000 // next month
    ));

    const batch = db.batch();

    // 1️⃣ Update EMI data
    batch.update(emiDoc.ref, {
      installments_left: newInstallments,
      amount_left: newAmountLeft,
      next_installment_date: newDue
    });

    // 2️⃣ Log payment
    const logRef = userRef.collection('emiTransactions').doc();
    batch.set(logRef, {
      paidAt: now,
      amount,
      method,
      status: isLate ? 'late' : 'onTime',
      createdBy: req.user.uid
    });

    await batch.commit();

    res.json({ success: true, message: 'EMI payment recorded', status: isLate ? 'late' : 'onTime' });
  } catch (error) {
    console.error('EMI payment error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function fetchEmiLogs (req, res) {
  try {
    const { endUserId } = req.params;

    if (!endUserId) {
      return res.status(400).json({ error: 'endUserId is required' });
    }

    const userRef = db.collection('endUsers').doc(endUserId);
    const logsSnap = await userRef.collection('emiTransactions')
      .orderBy('paidAt', 'desc')
      .get();

    const logs = logsSnap.docs.map(doc => {
      const data = doc.data();
      const paidAt = data.paidAt?.toDate();
      return {
        amount: data.amount,
        method: data.method,
        status: data.status,
        paidOn: paidAt
          ? paidAt.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          })          
          : null
      };
    });

    res.json({ success: true, emiLogs: logs });
  } catch (error) {
    console.error('Fetch EMI logs error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { payEMI, fetchEmiLogs };