const express = require("express");
const bcrypt = require("bcryptjs");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const app = express();
app.set("view engine", "ejs");

var session = require("express-session");
const UserModel = require("./models/User");
const eventModel = require("./models/TimeEvent");
const cartModel = require("./models/Cart");
const orderModel = require("./models/Order");
app.use(bodyparser.json());

app.use(
  bodyparser.urlencoded({
    parameterLimit: 100000,
    limit: "50mb",
    extended: true,
  })
);

app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Middleware
app.use((req, res, next) => {
  console.log(req.session);
  console.log(req.session.user);
  next();
});

function isAuth(req, res, next) {
  if (req.sessionID && req.session.authenticated) {
    next();
  } else {
    res.redirect("/login");
  }
}

function isAdmin(req, res, next) {
  if (req.session.user.admin) {
    return next();
  } else {
    res.redirect("/home");
  }
}

// Mongo Atlas Connect
mongoose
  .connect(
    "mongodb+srv://hchen256:comp1537@cluster0.74n5t.mongodb.net/timelineDB?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then((res) => {
    console.log("MongoDB connected");
  });

/**
 * Game Route
 */
app.get("/game", isAuth, async (req, res) => {
  res.render("game");
});

/*
  Admin Page Route
*/
app.get("/dashboard", isAuth, isAdmin, async (req, res) => {
  const users = await UserModel.find({});
  res.render("dashboard", { users, currentUser: req.session.user.email });
});

// Toggle admin priviledge
app.get("/dashboard/:email", isAuth, isAdmin, (req, res) => {
  const { email } = req.params;
  if (email != req.session.user.email) {
    UserModel.findOneAndUpdate(
      {
        email: email,
      },
      [
        {
          $set: { admin: { $not: "$admin" } },
        },
      ],
      (err, resp) => {
        if (err) {
          res.send(err);
        } else {
          res.redirect("/dashboard");
        }
      }
    );
  }
});

// Delete other account
app.get("/dashboard/remove/:email", isAuth, isAdmin, (req, res) => {
  const { email } = req.params;
  UserModel.findOneAndDelete({ email: email }, function (err, data) {
    if (err) {
      console.log("Error " + err);
    } else {
      console.log("Data " + data);
    }
  });
});

// Display user info editing page
app.get("/edit/:email", isAuth, async function (req, res) {
  const userInfo = await UserModel.find({
    _id: req.session.user._id,
  }).exec();
  const details = {
    firstname: userInfo[0].firstname,
    email: userInfo[0].email,
  };
  res.render("edit", { details });
});

// Edit user information
app.post("/edit/:name/:email", isAuth, async function (req, res) {
  const { name, email } = req.params;

  await UserModel.findByIdAndUpdate(
    req.session.user._id,
    {
      email: email,
      firstname: name,
    },
    { new: true }
  );
  res.redirect("/timeline");
});
// admin add regular user page
app.get("/adduser", isAuth, isAdmin, function (req, res) {
  res.render("adduser");
});
// admin add regular user route
app.post("/addnewuser", isAuth, isAdmin, async function (req, res) {
  const { firstname, lastname, email, password } = req.body;
  let user = await UserModel.findOne({ email });

  if (user) {
    return res.redirect("/register");
  }

  const hashedPsw = await bcrypt.hash(password, 12);
  user = new UserModel({
    firstname,
    lastname,
    email,
    password: hashedPsw,
  });
  await user.save();
  res.redirect("dashboard");
});

/*
 User Login Logout
*/
app.get("/", function (req, res) {
  res.redirect("login");
});
// Login
app.get("/login", function (req, res) {
  if (req.sessionID && req.session.authenticated) {
    res.redirect("timeline");
  } else {
    res.render("login");
  }
});

app.post("/login", async function (req, res) {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });
  const isMatch = await bcrypt.compare(password, user.password);

  if (!user || !isMatch) {
    return res.redirect("/login");
  }
  req.session.authenticated = true;
  req.session.user = user;
  res.redirect("/home");
});
// Registration
app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", async function (req, res) {
  const { firstname, lastname, email, password } = req.body;
  let user = await UserModel.findOne({ email });

  if (user) {
    return res.redirect("/register");
  }

  const hashedPsw = await bcrypt.hash(password, 12);
  user = new UserModel({
    firstname,
    lastname,
    email,
    password: hashedPsw,
  });
  await user.save();

  res.redirect("/login");
});
// Log out
app.get("/logout", isAuth, function (req, res) {
  res.render("logout");
});

app.post("/logout", isAuth, function (req, res) {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/");
  });
});

app.get("/home", isAuth, function (req, res) {
  res.render("home");
});

app.get("/search", isAuth, function (req, res) {
  res.render("search");
});

// Display all items in cart
app.get("/shoppingcart", isAuth, async function (req, res) {
  const allCarts = await cartModel
    .find({
      $and: [
        {
          owner: req.session.user._id,
        },
        {
          checkout: false,
        },
      ],
    })
    .exec();
  const cartItems = allCarts.map((item) => {
    const carItem = {
      _id: item._id,
      id: item.pokeID,
      price: item.price,
      quantity: item.quantity,
    };
    return carItem;
  });
  res.render("shoppingcart", { cartItems });
});

// Delete cart item
app.delete("/shoppingcart/remove/:id", isAuth, (req, res) => {
  cartModel.deleteOne(
    {
      _id: req.params.id,
    },
    function (err, data) {
      if (err) {
        console.log("Error " + err);
      } else {
        console.log("Deleted Data " + data);
      }
    }
  );
});

/* 
Timeline Event
*/
// Display all event cards from one user
app.get("/timeline", isAuth, async function (req, res) {
  const allActs = await eventModel
    .find({
      owner: req.session.user._id,
    })
    .exec();
  const allEvents = allActs.map((event) => {
    const userEvent = {
      _id: event._id,
      text: event.text,
      time: event.time,
    };
    return userEvent;
  });

  const userInfo = await UserModel.find({
    _id: req.session.user._id,
  }).exec();
  const details = {
    firstname: userInfo[0].firstname,
    email: userInfo[0].email,
  };
  // All fulfilled order
  const prevOrders = await orderModel
    .find({
      owner: req.session.user._id,
    })
    .exec();
  // Get all order IDs
  const allOrders = prevOrders.map((order) => {
    const orderEvent = {
      _id: order._id,
    };
    return orderEvent;
  });

  res.render("timeline", { allEvents, details, allOrders });
});

//Create
app.put("/timeline/insert", isAuth, function (req, res) {
  eventModel.create(
    {
      text: req.body.text,
      time: req.body.time,
      owner: req.session.user._id,
    },
    function (err, data) {
      if (err) {
        console.log("Error " + err);
      } else {
        console.log("Data " + data);
      }
      res.send(data);
    }
  );
});

//Delete
app.get("/timeline/remove/:id", isAuth, function (req, res) {
  eventModel.deleteOne({ _id: req.params.id }, function (err, data) {
    if (err) {
      console.log("Error " + err);
    } else {
      console.log("Data " + data);
    }
  });
});

const https = require("https");

// Pokemon profile
app.get("/profile/:id", isAuth, async function (req, res) {
  const url = `https://pokeapi.co/api/v2/pokemon/${req.params.id}`;
  data = "";
  await https.get(url, function (https_res) {
    https_res.on("data", function (chunk) {
      data += chunk;
    });
    https_res.on("end", function () {
      data = JSON.parse(data);
      obj_hp = data.stats
        .filter((obj) => {
          return obj.stat.name == "hp";
        })
        .map((obj) => {
          return obj.base_stat;
        });

      obj_atk = data.stats
        .filter((obj) => {
          return obj.stat.name == "attack";
        })
        .map((obj) => {
          return obj.base_stat;
        });

      obj_defense = data.stats
        .filter((obj) => {
          return obj.stat.name == "defense";
        })
        .map((obj) => {
          return obj.base_stat;
        });

      obj_abilities = [];
      for (i = 0; i < data.abilities.length; i++) {
        obj_abilities.push(data.abilities[i].ability.name);
      }

      obj_types = [];
      for (i = 0; i < data.types.length; i++) {
        obj_types.push(data.types[i].type.name);
      }

      res.render("profile.ejs", {
        id: req.params.id,
        name: data.name,
        hp: obj_hp[0],
        weight: data.weight,
        height: data.height,
        attack: obj_atk[0],
        defense: obj_defense[0],
        abilities: obj_abilities,
        types: obj_types,
      });
    });
  });
});

/*
Add to shopping cart
*/
app.post("/profile/:id", isAuth, function (req, res) {
  // price and pokeID retrieve
  var { quantity, price, pokeID } = req.body;
  quantity = Number(quantity);
  const newCart = cartModel({
    owner: req.session.user._id,
    pokeID: pokeID,
    price: price,
    quantity: quantity,
  });

  newCart.save();
  res.redirect("/success");
});

// success page
app.get("/success", isAuth, function (req, res) {
  res.render("success");
});

// User check out carts
app.post("/orders", isAuth, async function (req, res) {
  var allCheckCarts = await cartModel
    .find({
      $and: [
        {
          owner: req.session.user._id,
        },
        {
          checkout: false,
        },
      ],
    })
    .exec();
  allChecked = [];
  allCheckCarts.forEach((order) => {
    allChecked.push(order._id);
  });
  const newOrder = orderModel({
    owner: req.session.user._id,
    cart: allChecked,
  });
  newOrder.save();
  // Updated checkout status to true
  allChecked.forEach((checked) => {
    cartModel.findByIdAndUpdate(
      checked,
      { checkout: true },
      { new: true },
      function (err, response) {
        if (err) {
          console.log("we hit an error" + err);
          res.json({
            message: "Database Update Failure",
          });
        }
        console.log("Success Checkout Cart");
      }
    );
  });
  res.redirect("/timeline");
});

// Prev Orders page
app.get("/order/:id", isAuth, async function (req, res) {
  const id = req.params.id;
  // Find specific fulfilled order by ID
  const prevOrders = await orderModel
    .find({
      _id: id,
    })
    .exec();
  //Carts Array
  allOrder = [];
  prevOrders[0].cart.forEach((orderItem) => {
    allOrder.push(orderItem);
  });

  const allCarts = await cartModel.find({ _id: { $in: allOrder } }).exec();
  const cartItems = allCarts.map((item) => {
    const cartItem = {
      _id: item._id,
      id: item.pokeID,
      price: item.price,
      quantity: item.quantity,
    };
    return cartItem;
  });

  res.render("orders", { cartItems });
});

app.use(express.static("./public"));

app.listen(process.env.PORT || 5003, function (err) {
  if (err) console.log(err);
});