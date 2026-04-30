const orm = require('mongoose');

module.exports= new orm.Schema({
    name:String,
    buyingPrice:Number,
    sellingPrice:Number,
    mode:Array,
    category:String,
    weight:String,
});
