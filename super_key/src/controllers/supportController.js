const { db, admin } = require('../config/firebase');

const uploadTutorial = async (req, res) => {
  try {
    const { title, videoUrl } = req.body;
    if (!title || !videoUrl) {
      return res.status(400).json({ error: 'Missing title or video URL' });
    }

    const docRef = db.collection('tutorials').doc();
    await docRef.set({
      title,
      videoUrl,
      createdAt: admin.firestore.Timestamp.now()
    });

    res.json({ success: true, message: 'Tutorial uploaded', id: docRef.id });
  } catch (err) {
    console.error('Tutorial upload error:', err);
    res.status(500).json({ error: err.message });
  }
}

const fetchTutorials = async (req, res) => {
  try {
    const snap = await db.collection('tutorials')
      .orderBy('createdAt', 'desc')
      .get();

    const tutorials = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        videoUrl: data.videoUrl
      };
    });

    res.json({ success: true, tutorials });
  } catch (err) {
    console.error('Fetch tutorials error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  uploadTutorial,
  fetchTutorials
}