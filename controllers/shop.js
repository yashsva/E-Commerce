const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
//To get API keys from .env files (Using process.env.<variable_name> )
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_KEY);


const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1; // plus sign for converting to integer

  let totalItems;

  Product.countDocuments().then((numberOfProducts) => {

    totalItems = numberOfProducts;
    return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);

  }).then(products => {
    res.render('shop/product-list', {
      prods: products,
      pageTitle: 'Products',
      path: '/products',
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: (page + 1),
      previousPage: (page - 1),
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
    });
  })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',

      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {

  const page = +req.query.page || 1; // plus sign for converting to integer

  let totalItems;

  Product.countDocuments().then((numberOfProducts) => {

    totalItems = numberOfProducts;
    return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);

  }).then(products => {
    res.render('shop/index', {
      prods: products,
      pageTitle: 'Shop',
      path: '/',
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: (page + 1),
      previousPage: (page - 1),
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
    });
  })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,

      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      // console.log(result);
      console.log('Added to Cart');
      res.redirect('/cart');
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      console.log('Deleted from cart')
      res.redirect('/cart');
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      console.log('Order Placed');
      res.redirect('/orders');
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,

      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error('No Order Found.'));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('UnAuthorized Access.'));
      }
      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);

      const pdfDoc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline;filename"' + invoiceName + '"');


      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice',
        {
          underline: true
        });

      pdfDoc.fontSize(12).text('--------------------------------------');

      let totalPrice = 0;
      order.products.forEach((prod) => {
        let productTotalPrice = prod.quantity * prod.product.price;
        pdfDoc.text(prod.product.title + '  --  ' + prod.quantity + ' * ' + 'Rs.' + prod.product.price + '  =  Rs.' + productTotalPrice);

        totalPrice += productTotalPrice;

      });

      pdfDoc.text('--------------------------------------');

      pdfDoc.fontSize(14).text("Total Price :  Rs." + totalPrice);


      pdfDoc.end();

      /* for small size files */

      // fs.readFile(invoicePath,(err,data)=>{
      //   if(err){
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type','application/pdf');
      //   res.setHeader('Content-Disposition','inline;filename"'+invoiceName+'"');
      //   res.send(data);
      // })

      /* for big size files */
      // const file=fs.createReadStream(invoicePath);
      // res.setHeader('Content-Type','application/pdf');
      //   res.setHeader('Content-Disposition','inline;filename"'+invoiceName+'"');

      //   file.pipe(res);
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });



}


exports.getCheckout = (req, res, next) => {

  let products, total = 0;

  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      products = user.cart.items;


      products.forEach((prod) => {
        total += prod.quantity * prod.productId.price;
      })

      return stripe.checkout.sessions.create({

        payment_method_types: ['card'],
        line_items: products.map((prod) => {
          return {
            name: prod.productId.title,
            description: prod.productId.description,
            amount: prod.productId.price * 100,
            currency: 'inr',
            quantity: prod.quantity,
          };
        }),

        success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel',


      });


    })
    .then((session) => {
      res.render('shop/checkout', {
        path: '/checkput',
        pageTitle: 'Checkout',
        products: products,
        totalSum: total,
        sessionId: session.id
      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });







}