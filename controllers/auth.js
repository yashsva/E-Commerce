const bcrypt = require('bcryptjs');
const nodemailer=require('nodemailer');
const sendgridTransport=require('nodemailer-sendgrid-transport');

const User = require('../models/user');
const { error } = require('console');


//To get API keys from .env files (Using process.env.<variable_name> )
require('dotenv').config();

const transporter=nodemailer.createTransport(sendgridTransport({
    auth : {
        api_key: process.env.SENDGRID_API_KEY
    }
}));


exports.getLogin = (req, res, next) => {
    // console.log(req.session);

    let errorMessage=req.flash('error'); 
    if(errorMessage==0)
    errorMessage=null;

    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage:errorMessage
    });


};
exports.postLogin = (req, res, next) => {

    const email = req.body.email;
    const password = req.body.password;

    User.findOne({ email: email })
        .then(user => {

            
            if (!user) {    //user not found

                req.flash('error','Invalid email or password.');
                return res.redirect('/login');
            }

            bcrypt.compare(password, user.password)
                .then((isMatched) => {
                    if (isMatched) {
                        req.session.user = user;
                        req.session.isLoggedIn = true;
                        return req.session.save((err) => {

                            if (err) {
                                console.log(err);
                            }
                            
                            res.redirect('/');

                        });
                         
                    }
                    else {
                        req.flash('error','Invalid email or password.');
                        res.redirect('/login')

                    }
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login')
                });


        })
        .catch(err => console.log(err));


};

exports.postLogout = (req, res, next) => {

    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    })

};


exports.getSignup = (req, res, next) => {

    let errorMessage=req.flash('error'); 
    if(errorMessage==0)
    errorMessage=null;

    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage:errorMessage
    });

};


exports.postSignup = (req, res, next) => {

    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    User.findOne({ email: email })
        .then((userDoc) => {
            if (userDoc) {
                req.flash('error','E-Mail already exists');
                return res.redirect('/signup');
            }
            return bcrypt.hash(password, 12)
                .then((hashedPassword) => {
                    const user = new User({
                        email: email,
                        password: hashedPassword,
                        cart: { items: [] }
                    });
                    return user.save();
                })
                .then((result) => {
                    res.redirect('/login');
                    return transporter.sendMail({
                        to:email,
                        from:process.env.SENDING_EMAIL_FROM,    //getting email from .env file
                        subject:"SignUp Succeded !",
                        html:'<h1>Welcome !</h1><h2>You Successfully signed up at our platform !</h2>'
                    }).catch(err => console.log(err));
                })
                .catch(err => console.log(err));

        })
        .catch(err => console.log(err))

};
