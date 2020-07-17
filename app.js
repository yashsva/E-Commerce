const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  User.findById('5f11829bd2cd1a38f4954417')
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => console.log(err));
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

const dbUri='mongodb+srv://Yash:sunil@mongodb@yash-cluster.qzqmk.mongodb.net/E-commerceProject?retryWrites=true&w=majority';

mongoose
  .connect( dbUri ,{ useNewUrlParser: true ,useUnifiedTopology: true})
  .then(result => {
    User.findOne().then(user => {
      if (!user) {
        const user = new User({
          name: 'Yash',
          email: 'y@test.com',
          cart: {
            items: []
          }
        });
        user.save();
      }
    });
    console.log('Connected to DB');
    app.listen(3500);
  })
  .catch(err => {
    console.log(err);
  });
