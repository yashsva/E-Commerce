const path = require('path');
const express = require('express');
const https = require('https');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');


const errorController = require('./controllers/error');
const User = require('./models/user');

//To get API keys from .env files (Using process.env.<variable_name> )
require('dotenv').config();



const app = express();

const MONGODB_URI = process.env.MONGODB_URI;



const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',

});

const csrfProtection = csrf();

//for issuing ssl certificates
// const privateKey=fs.readFileSync('server.key');
// const certificate=fs.readFileSync('server.cert');

const imageFileStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  filename: (req, file, callback) => {
    callback(null, new Date().getTime() + '-' + file.originalname);   //new Date().toISOString() + '-' +
  }
});
//For multer-> fliter file types
const fileFilter = (req, file, callback) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {

    callback(null, true);
  }
  else {
    callback(null, false);
  }
}



app.set('view engine', 'ejs');
app.set('views', 'views');



const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

//set secure response headers
app.use(helmet());
//compress assets while sending response
app.use(compression());
//log the requests in a file
app.use(morgan('combined',{ stream:accessLogStream}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: imageFileStorage, fileFilter: fileFilter }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(
  session(
    {
      secret: 'my secret',
      resave: false,
      saveUninitialized: false,
      store: store
    })
);

app.use(csrfProtection);

app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();

  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {

      next(new Error(err));
    });
});



app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log('500 Error');
  // console.log(req);
  // console.log('Error', error);

  res.status(500).render('500',
    {
      pageTitle: 'Error',
      path: '/500',
    });
})


mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(result => {

    console.log('Connected to DB');
    // to use https
    // https.createServer({key:privateKey,cert:certificate},app).listen(process.env.PORT || 3500);
    
    // to use http
    app.listen(process.env.PORT || 3500);
  })
  .catch(err => {
    console.log(err);
  });
