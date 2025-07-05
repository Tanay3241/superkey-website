const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const app = express();

// Middleware
app.use((req, res, next) => {
  console.log(`App: Request received: ${req.method} ${req.url}`);
  next();
});
app.use(cookieParser());
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions'
});

// Catch errors
store.on('error', function(error) {
  console.error('MongoDB Session Store Error:', error);
});

store.on('connected', function() {
  console.log('MongoDB Session Store Connected!');

});

store.on('disconnected', function() {
  console.warn('MongoDB Session Store Disconnected!');
});

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'None', // Required for cross-site cookies
  }
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/users', require('./routes/users').router);
app.use('/api/endusers', require('./routes/endUsers').router);
app.use('/api/keys', require('./routes/keys').router);
app.use('/api/emi', require('./routes/emi').router);
app.use('/api/support/', require('./routes/support').router);
app.use('/setup', require('./routes/setup').router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  process.exit(1);
});

module.exports = app;
