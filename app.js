import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


dotenv.config({path:'./.env'});
const app = express();
const port = process.env.port || 10000;

//multer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now());
    }
  });

const upload = multer({ storage: storage });


//database connection

mongoose.connect(process.env.con_string
).then((conn)=>{
    console.log(conn);
    console.log("DB connected successfuly");
}).catch((error)=>{
    console.log(error);
});


//carousel schema
const carouselSchema = new mongoose.Schema({
    img:{
        data: Buffer,
        contentType: String
    }
});

const Carousel = mongoose.model("Carousel",carouselSchema);



//category schema
const categorySchema = new mongoose.Schema({
    categoryName:String,
    menu:[new mongoose.Schema({
        foodType:String,
        price:String,
        foodImage:String,
        description:String,
    })]
});

const Category = mongoose.model("Category",categorySchema);

//midelware
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
app.use(express.static("public"));


//ROUTES
//get home page
app.get("/",async(req,res)=>{
    try{
        const categories = await Category.find({});
        const mainCategory = categories[0];
        const carousels = await Carousel.find({});
        res.render("home.ejs",{
            categories:categories,
            mainCategory:mainCategory,
            carousels:carousels,
        });
    }catch(err){
        console.log(err)
        res.send("check your connection")
    }
});

//admin
app.get("/admin",async(req,res)=>{
    try{
        const categories = await Category.find({});
        const carousels = await Carousel.find({});
        res.render("admin.ejs",{
            categories:categories,
            carousels:carousels,
        });
    }catch(err){
        console.log(err)
        res.send("check your connection")
    }
});


//get form

app.get("/addCarousel",async(req,res)=>{
    res.render("form.ejs",{
        addCar:"true",
    });
});

app.get("/addCategory",async(req,res)=>{
    res.render("form.ejs",{
        addCat:"true",
    });
});

app.get("/updateCategory/:_id",async(req,res)=>{
    res.render("form.ejs",{
        category:await Category.findOne({_id:req.params._id}),
        updateCat:"true",
    });
});

app.get("/addMenu/:_id",async(req,res)=>{
    res.render("form.ejs",{
        _id:(await Category.findOne({_id:req.params._id}))._id,
        addMe:"true",
    });
});

app.get("/updateMenu/:_id1/:_id2",async(req,res)=>{
    const id = (req.params._id2)
    const category = await Category.findOne({_id:req.params._id1})
    let menu;
    (category.menu).forEach(element => {
        if(element._id==id){
            menu = element;
        }
    });
    res.render("form.ejs",{
        category,
        menu,
        updateMe:"true",
    });
});



//menu
app.get("/menu/:_id",async(req,res)=>{
    try{
        const category = await Category.findOne({_id:req.params._id});
        res.render("menu.ejs",{
            category,
            menu:category.menu,
            name:category.categoryName
        });
    }catch(err){
        console.log(err)
        res.send("check your connection")
    }
});

//add new category
app.post("/addCategory",async(req,res)=>{
    try{
        const categoryName = req.body.categoryName;
        const newCategory = await Category.create({categoryName});
        res.redirect("/admin");
     }catch(err){
        res.send("check your connection");
    }
   
 });

 //add menu
 app.post("/addMenu/:_id",async(req,res)=>{
    try{
        const menu = {
            foodType:req.body.foodType,
            price:req.body.foodPrice,
            foodImage:req.body.foodImage,
            description:req.body.description
        };
   
        await Category.findOneAndUpdate({_id:req.params._id},{$push:{menu:menu}},{new:true});
        res.redirect("/menu/"+(req.params._id));
     }catch(err){
        console.log(err)
        res.send("check your connection");
    }
   
 });

 //update category
 app.post("/updateCategory/:_id",async(req,res)=>{
    try{
        await Category.findOneAndUpdate({_id:req.params._id},{categoryName:req.body.categoryNameUpdate},{new:true});
        res.redirect("/admin");
     }catch(err){
        res.send("check your connection");
    }
   
 });
 

 //update menu
 app.post("/updateMenu/:_id1/:_id2",async(req,res)=>{
    try{
        const updatedMenu = {
            foodType:req.body.foodTypeUpdate,
            price:req.body.foodPriceUpdate,
            foodImage:req.body.foodImageUpdate,
            description:req.body.descriptionUpdate
        };
        await Category.findOneAndUpdate({_id: req.params._id1, "menu._id": req.params._id2},{$set: {"menu.$": updatedMenu} },{new: true});
        res.redirect("/menu/"+(req.params._id1));
     }catch(err){
        res.send("check your connection");
    }
   
 });


 //delete category
 app.get("/deleteCategory/:_id",async(req,res)=>{
    try{
        await Category.deleteOne({_id: req.params._id});
        res.redirect("/admin");
     }catch(err){
        res.send("check your connection");
    }
 });

 //delete menu
 app.get("/deleteMenu/:_id1/:_id2",async(req,res)=>{
    try{
        await Category.findOneAndUpdate({_id: req.params._id1},{$pull: {menu: {_id: req.params._id2} }},{new: true});
        res.redirect("/menu/"+(req.params._id1));
     }catch(err){
        res.send("check your connection");
    }
 });

//add carousel
 app.post("/addCarousel",upload.single('carouselImage'),async(req,res)=>{
    try{
        const carousel = new Carousel({
            img: {
                data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                contentType: 'image/png'
            }
        });
        await Carousel.create(carousel);
        res.redirect("/admin");
    }catch(err){
        res.send("check your connection");
    }
});

//delete carousel
app.get("/deleteCarousel/:_id",async(req,res)=>{
    try{
        await Carousel.deleteOne({_id: req.params._id});
        res.redirect("/admin");
     }catch(err){
        res.send("check your connection");
    }
 });





const server = app.listen(port, () => {
    console.log(`listening for requests on port: ${port}`);
});
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000; 
