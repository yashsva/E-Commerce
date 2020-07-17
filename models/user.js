const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;
class User {
    constructor(username, email, cart, id) {
        this.username = username;
        this.email = email;
        this.cart = cart; // { items: []  }
        this._id = id;
    }
    
    save() {
        
        const db = getDb();
        return db.collection('users').insertOne(this)
        .then((result) => {
            console.log('New User Created');
            // console.log(result);
        }).catch(err => console.log(err))
    }


    static findById(id) {
        const db = getDb();
        return db.collection('users').findOne({ _id: new mongodb.ObjectId(id) })
            .then((user) => {
                // console.log('User Found');
                // console.log(user);
                return user;
            }).catch(err => console.log(err))
    
    }

    

    addToCart(product) {
        // console.log(product._id);
        const cartProductIndex = this.cart.items.findIndex((prod) => { return prod.productId.toString() === product._id.toString() });

        let newQuantity = 1;
        const updatedCartItems = [...this.cart.items];

        if (cartProductIndex >= 0) {
            console.log('Product already present in Cart');
            newQuantity = this.cart.items[cartProductIndex].quantity + 1;
            updatedCartItems[cartProductIndex].quantity = newQuantity;
        }
        else {
            updatedCartItems.push({ productId: new mongodb.ObjectId(product._id), quantity: newQuantity })
        }

        const updatedCart = { items: updatedCartItems };

        const db = getDb();

        return db.collection('users').updateOne(
            {
                _id: new mongodb.ObjectId(this._id)
            },
            {
                $set: { cart: updatedCart }
            });

    }

    getCart() {
        const db = getDb();
        const productIds = this.cart.items.map((entry) => { return entry.productId; })
        return db.collection('products').find({ _id: { $in: productIds } }).toArray()
            .then((products) => {
                return products.map((product) => {
                    return {
                        ...product,
                        quantity: this.cart.items.find((i) => { return i.productId.toString() === product._id.toString(); }).quantity
                    };
                })
            })

    }


    deleteItemFromCart(productId) {
        const updatedCartItems = this.cart.items.filter((item) => {
            return item.productId.toString() !== productId.toString();
        });

        const db = getDb();
        return db.collection('users').updateOne(
            {
                _id: new mongodb.ObjectId(this._id)
            },
            {
                $set: { cart: { items: updatedCartItems } }
            });


    }


    addOrder(){
        const db=getDb();

        return this.getCart()
        .then((products)=>{

            const order={
                items: products,
                user : {
                    _id : new mongodb.ObjectID(this._id),
                    username: this.username,
                    email: this.email
                }
            }

            return db.collection('orders').insertOne(order);
        })
        .then((result)=>{
            this.cart={ items: [] };

            return db.collection('users').updateOne(
                {
                    _id: new mongodb.ObjectId(this._id)
                },
                {
                    $set: { cart: { items: [] } }
                });
        });
    }

    getOrders(){

         const db=getDb();
        return db.collection('orders').find({ 'user._id' : new mongodb.ObjectID(this._id) }).toArray();
    }

}
module.exports = User;