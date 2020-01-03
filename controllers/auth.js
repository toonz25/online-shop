const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const User = require('../models/user');

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: process.env.SENDGRID_API_KEY
  }
}))

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: req.flash('error')[0],
  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: req.flash('error')[0],
  });
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;
  User.findOne({ email })
    .then(user => {
      if(!user) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/login');
      }
      bcrypt.compare(password, user.password)
        .then(doMatch => {
          if(doMatch){
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              if(err) console.log(err)
              res.redirect('/');
            })
          }
          req.flash('error', 'Invalid email or password');
          return res.redirect('/login');
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login')
        })
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const { email, password, confirmPassword } = req.body;
  User.findOne({ email: email }).then(user => {
    if(user){

      req.flash('error', 'Email already signed up');
      return res.redirect('/signup');
    }
    return bcrypt.hash(password, 12)
    .then(hashedPass => {
      const newUser = new User({
        email,
        password: hashedPass,
        cart: {items: []}
      });
      return newUser.save()
        .then(result => {
          res.redirect('/login');

          return transporter.sendMail({
            to: email,
            from: 'shop@node-complete.com',
            subject: 'Signup successful',
            html: '<h1>You have signed up</h1>'
          })
        })
        .catch(err => console.log(err));
    });
    
  }).catch(err => console.log(err))
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    if(err) console.log(err);
    res.redirect('/')
  });
};

exports.getReset = (req, res, next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: req.flash('error')[0],
  });
};

exports.postReset = (req, res, next) => {
  const { email } = req.body;
  crypto.randomBytes(32, (err, buffer) => {
    if(err){
      console.log(err);
      res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({ email: email })
    .then((user) => {
      if(!user){
        req.flash('error', 'No account with specified email found');
        return res.redirect('/reset');
      }
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;
      return user.save();
    })
    .then(result => {
      res.redirect('/');
      transporter.sendMail({
        to: email,
        from: 'shop@node-complete.com',
        subject: 'Password Reset',
        html: `<p>You requested a password reset</p>
              <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password`
      })
    })
    .catch(err => console.log(err))
  })
};
