const bcrypt = require('bcryptjs');
const nodemailer=require('nodemailer');
const crypto = require('crypto');;

const User = require('../models/user');
const { error } = require('console');


//To get API keys from .env files (Using process.env.<variable_name> )
require('dotenv').config();

const transporter=nodemailer.createTransport({
    service:'gmail',
    auth : {
        user:process.env.SENDING_EMAIL_FROM,
        pass:process.env.EMAIL_PASSWORD
    }
});


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
                    const msg={
                        to:email,
                        from:process.env.SENDING_EMAIL_FROM,    //getting email from .env file
                        subject:"SignUp Succeded !",
                        text:"Hello !",
                        html:'<h2>You Successfully signed up at our platform !</h2>',
                    }
                    // console.log(msg);
                    return transporter.sendMail(msg,(err,info)=>{
                        if(err)
                        console.log('error',err);
                        else
                        {
                            console.log("Signup E-mail Sent");
                            // console.log('info',info);
                        }
                    });
                })
                .catch(err => console.log(err));

        })
        .catch(err => console.log(err))

};

exports.getReset=(req,res,next)=>{

    let errorMessage=req.flash('error'); 
    if(errorMessage==0)
    errorMessage=null;

    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage:errorMessage
    });
}

exports.postReset=(req,res,next)=>{

    crypto.randomBytes(32,(err,buffer)=>{
        if(err){
            console.log(err);
            return redirect('/reset');
        }
        const token=buffer.toString('hex');
        User.findOne({email: req.body.email})
        .then((user)=>{
            if(!user){
                req.flash('error','Email Not Registered');
                return res.redirect('/reset');
            }
            user.resetToken=token;
            user.resetTokenExpiration=Date.now() + 3600000;
            return user.save();
        })
        .then((result)=>{
            return transporter.sendMail({
                to:req.body.email,
                from:process.env.SENDING_EMAIL_FROM,    //getting email from .env file
                subject:"Reset Password ",
                html:`
                <p>You requested password reset</p>
                <p>Click this <a href="http://localhost:3500/reset/${token}">link</a> to reset password</p>
                `
            }).catch(err => console.log(err));
        })
        .catch(err=>console.log(err));
    });

}

exports.getNewPassword=(req,res,next)=>{

    const token=req.params.token;

    User.findOne({ resetToken:token , resetTokenExpiration : { $gt : Date.now() }  })
    .then((user)=>{
        let errorMessage=req.flash('error'); 
        if(errorMessage==0)
        errorMessage=null;
    
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage:errorMessage,
            userId:user._id.toString(),
            passwordToken: token
        });
    }).catch(err=>console.log(err));

   
}


exports.postNewPassword=(req,res,next)=>{
    const newPassword=req.body.password;
    const userId=req.body.userId;
    const passwordToken=req.body.passwordToken;

    let resetUser;

    User.findOne({_id:userId,resetToken:passwordToken,resetTokenExpiration:{ $gt : Date.now() } })
    .then((user)=>{
        resetUser=user;
        return bcrypt.hash(newPassword,12);
    })
    .then((hashedPassword)=>{
        resetUser.password=hashedPassword;
        resetUser.resetToken=undefined;
        resetUser.resetTokenExpiration=undefined;

        resetUser.save();

    })
    .then((result)=>{
        res.redirect('/login');
    })
    .catch(err=>console.log(err));

}