const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');


const errorController = require('./controllers/error');

const mongoConnect=require('./util/database').mongoConnect;

//import models
const User=require('./models/user');


const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/favicon.ico', (req, res, next) => {
    res.send('No icon present');
});
app.use((req, res, next) => {
    User.findById('5f1071c26280179088176b19')
        .then((user) => {
            // console.log(user);
            req.user = new User(user.username, user.email , user.cart , user._id );
            next();
        }).catch(err => console.log(err));
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

mongoConnect(()=>{

    app.listen(3500);
});


