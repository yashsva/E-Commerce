const User=require('../models/user');


exports.getLogin = (req, res, next) => {
    // console.log(req.session); 
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        isAuthenticated: false
    });


};
exports.postLogin = (req, res, next) => {

    User.findById('5f11829bd2cd1a38f4954417')
    .then(user => {

      req.session.user = user;
      req.session.isLoggedIn =true;
      req.session.save((err)=>{

        if(err){
            console.log(err);
        }
          res.redirect('/');

      });

    })
    .catch(err => console.log(err));
    

};

exports.postLogout = (req, res, next) => {

    req.session.destroy((err)=>{
        if(err){
            console.log(err);
        }
        res.redirect('/');
    })

};
