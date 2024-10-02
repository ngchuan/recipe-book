const express = require('express');
const cors = require('cors');

let app = express();
app.use(cors());

// add routes here
app.get('/', function(req,res){
    res.json({
       "message":"hello world world"

    });
})

app.get('/hello/:name', (req,res)=>{
    let name = req.params.name;
    res.send("Hi, " + name);
  })
  
  

app.listen(3000, ()=>{
    console.log("Server started")
})

