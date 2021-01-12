const {
  validationResult
} = require('express-validator/check');
const Product = require('../models/product');
const {
  error
} = require('console');

const fileHelper = require('../util/file');
const cloudinary_util = require('../util/cloudinary');




exports.getAddProduct = (req, res, next) => {

  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
  });
};

exports.postAddProduct = (req, res, next) => {
  // console.log('adding Product');
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  // console.log(image)

  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: "Attached file is not an image.",


    });
  }


  // console.log(req);


  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    if (image) {
      fileHelper.deleteFile(image.path);
    }
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,

    });
  }

  var imageUrl = image.path;
  // console.log("path - ", image.path);
  // console.log(imageUrl);

  cloudinary_util.uploader.upload(image.path, {
    folder: "e-comm-shop/product_images",
    format: "jpg"
  }, (err, result) => {

    // console.log(result);
    var {
      public_id
    } = result;
    imageUrl = public_id;

    fileHelper.deleteFile(image.path);
  }).then(() => {

    const product = new Product({
      title: title,
      price: price,
      description: description,
      imageUrl: imageUrl,
      userId: req.user
    });

    return product.save();
  }).then(result => {
    // console.log(result);
    console.log('Created Product');
    res.redirect('/admin/products');
  })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);

      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const updatedImage = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        _id: prodId,
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
      },
      errorMessage: errors.array()[0].msg,

    });
  }

  var updatedImageUrl, oldImageUrl;
  var updatedProduct;


  return Product.findById(prodId)
    .then(product => {

      // console.log(req.user._id);
      if (product.userId.toString() !== req.user._id.toString()) {
        res.redirect('/');
        throw new Error("Unauthorized");
      }

      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;

      updatedProduct = product;

    }).then(() => {
      if (updatedImage) {
        oldImageUrl = updatedProduct.imageUrl;

        return cloudinary_util.uploader.upload(updatedImage.path, {
          folder: "e-comm-shop/product_images",
          format: "jpg"
        }, (err, result) => {

          // console.log(public_id);
          var { public_id } = result;
          updatedProduct.imageUrl = public_id;


        }).then(() => {
          fileHelper.deleteFile(updatedImage.path);
          return cloudinary_util.uploader.destroy(oldImageUrl, { invalidate: true }, (err, result) => {
            // console.log(result);
          })
        })

      }
    }).then(() => {

      return updatedProduct.save()
    })
    .then(result => {
      console.log('UPDATED PRODUCT!');
      return res.redirect('/admin/products');
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });

};

exports.getProducts = (req, res, next) => {
  const ITEMS_PER_PAGE = 2;


  const page = +req.query.page || 1; // plus sign for converting to integer

  let totalItems;

  Product.find({
    userId: req.user._id
  }).countDocuments()
    .then((numberOfProducts) => {

      totalItems = numberOfProducts;
      return Product.find({
        userId: req.user._id
      }).skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);

    }).then(products => {

      // console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
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

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return next(new Error('Product not found'));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({
        _id: prodId,
        userId: req.user._id
      });
    })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({
        message: "Success"
      });
    })
    .catch(err => {
      // console.log(err);
      res.status(500).json({
        message: 'Deleting Product failed'
      });
    });
};