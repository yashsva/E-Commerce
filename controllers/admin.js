
const Product = require('../models/product');

exports.getAddProduct = (req, res, next) => {

    res.render('admin/edit-product', {
        pageTitle: "Add Product",
        path: '/admin/add-product',
        editing: false
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;
    const description = req.body.description;
    const price = req.body.price;
    const product = new Product(title, price, description, imageUrl,null,req.user._id);
    product.save()
        .then((result) => {
            console.log('New Product Created');
            res.redirect('/admin/products')
        }).catch(err => console.log(err));
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }

    const productId = req.params.productId;

    Product.findById(productId)
        .then((product) => {
            // console.log(products);

            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: "Edit Product",
                path: '/admin/edit-product',
                editing: editMode,
                product: product
            });
        })
        .catch(err => console.log(err));


};

exports.postEditProduct = (req, res, next) => {

    const productId = req.body.productId;

    const updatedTitle = req.body.title;
    const updatedImageUrl = req.body.imageUrl;
    const updatedDescription = req.body.description;
    const updatedPrice = req.body.price;



    const product = new Product(updatedTitle, updatedPrice, updatedDescription, updatedImageUrl, productId);

    product.save()
        .then((result) => {
            console.log('product updated');
            res.redirect('/admin/products');
        }).catch(err => console.log(err));


};


exports.deleteProduct = (req, res, next) => {
    const productId = req.body.productId;
    // console.log(productId);
    Product.deleteById(productId)
    .then((result) => {
        
        res.redirect('/admin/products');
    })
        .catch(err => console.log(err));

}

exports.getProducts = (req, res, next) => {
    Product.fetchAll()
        .then((products) => {

            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products',
            });
        }).catch(err => console.log(err));


};

