const express= require("express");
const app =express();
const items = require("./orm/inventory");
const orm = require("mongoose");
require('dotenv').config()

app.listen(8000,()=>{
    console.log("Server Sarted");
});
app.get("/",(req,res)=>{

    res.send("Hello PP");
});


app.get("/items",async (req,res)=>{
await orm.connect(process.env.DB);
console.log("connected");
const m =await orm.model("Inventory",items);
const j = new m({"sbs":"dhh"});
j.save();
res.send(j);

});