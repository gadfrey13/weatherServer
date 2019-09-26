//express is just a server library
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); //allow you to connect with other websites.
const knex = require("knex"); //connects the server to the database
const app = express();
const bcrypt = require("bcrypt-nodejs");

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "Power4full",
    database: "weather"
  }
});

// //express has a concept of middleware
// //middleware is use to make you process
// app.use((req,res,next) => {
//     next();//you need next to cascade downwards.
// })
//this is so you can form urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
//so you can read a json file
app.use(bodyParser.json());
//allow you to connect to other websites
app.use(cors());

//signin
app.post("/signin", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then(data => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", req.body.email)
          .then(user => {
            res.json(user[0]);
          })
          .catch(err => res.status(400).json("unable to get user"));
      } else {
        res.status(400).json("wrong credentials");
      }
    })
    .catch(err => res.status(400).json("wrong credentials"));
});
//register
app.post("/register", (req, res) => {
  const { firstname, lastname, password, email } = req.body;
  const hash = bcrypt.hashSync(password);

  db.transaction(trx => {
    trx
      .insert({
        hash: hash,
        email: email
      })
      .into("login")
      .returning("email")
      .then(loginEmail => {
        return trx("users")
          .returning("*") //so you dont have to take an extra step of returning the values
          .insert({
            firstname: firstname,
            lastname: lastname,
            email: loginEmail[0],
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch(err => res.status(400).json("unable to register"));
});

//express does the json.stringfy for you
app.post("/profile", (req, res) => {
  const { id } = req.body;
  db.select("weatherlocation", "save")
    .from("locations")
    .where("userid", "=", id)
    .where("deleted", "=", false)
    .then(data => {
      res.json(data);
    })
    .catch(err => res.status(400).json("unable to get weather locations"));
});

//weather locations
app.post("/profile/save", (req, res) => {
  const { id, weatherLoc } = req.body;
  console.log("save", req.body);
  db("locations")
    .insert({
      userid: id,
      weatherlocation: weatherLoc
    })
    .then(response => {
      res.json("successful insert");
    })
    .catch(err => {
      console.log(err);
      if (err.code === "23505") {
        db("locations")
          .where("userid", "=", id)
          .where("weatherlocation", "=", weatherLoc)
          .update({
            deleted: false
          })
          .then(response => {
            res.json("successfull save update");
          })
          .catch(err => res.status(503).json("unable to connect to database"));
      }else{
        res.status(503).json("unable to connect to database");
      }
    });
});

//change the value of the delete column from false to true
app.put("/profile/delete", (req, res) => {
  const { id, weatherLoc } = req.body;
  db("locations")
    .where("userid", "=", id)
    .where("weatherlocation", "=", weatherLoc)
    .update({
      deleted: true
    })
    .then(response => {
      res.json("successfull delete");
    })
    .catch(err => res.status(503).json("unable to connect to database"));
});

//NOTES
// app.post("/profile", (req, res) => {
//   //req.query gets the query from the client. Query always start with ? example localhost:3000/profile/?name=jack&age=19
//   //req.body what is send through the body
//   //req.header you get the header values. for example content type
//   //req.params you use the parameters of the url. Example '/:id'
//   console.log(req.body);
//   //res can status for example res.status(404).send("not found");
//   res.send("success");
// });

app.listen(2500);
