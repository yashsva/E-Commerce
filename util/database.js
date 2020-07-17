const mongodb=require('mongodb');
const MongoClient=mongodb.MongoClient;

let database;

const dbUri='mongodb+srv://Yash:sunil@mongodb@yash-cluster.qzqmk.mongodb.net/E-commerceProject?retryWrites=true&w=majority';
const mongoConnect=(callback)=>{

    MongoClient.connect(dbUri,{useUnifiedTopology: true })
    .then((client)=>{
        console.log('Connected to DB');
        database=client.db();
        callback(); 
    })
    .catch(err=>{
        console.log(err);
        throw err;
    });
}

const getDb=()=>{
    if(database){
        return database;
    }
    throw 'No Database found';
}


exports.mongoConnect=mongoConnect;
exports.getDb=getDb;
