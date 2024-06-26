const jwt = require("jsonwebtoken");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const port_server = 5000;
const { user_modal, lawyer_modal, Connection } = require("./mongoDBcon.js");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { transporter } = require("./NodeMailer.js");
const favicon = require("serve-favicon");
const path = require("path");
const multer = require("multer");
const { log } = require("console");

//Set storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "uploads");
    cb(null, uploadPath); // Destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    // Keep the original filename
    cb(null, file.originalname);
  },
});

// Initialize multer
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Allow only PDF files
    if (path.extname(file.originalname) !== ".pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
}).single("pdfFile"); // 'pdfFile' is the name attribute of the file input field

// for favicon
app.use(favicon(path.join(__dirname, "public", "favicon.png")));

// cookie-parser
app.use(cookieParser());

// Use express-session middleware with MongoDB as the session store
app.use(
  session({
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      httpOnly: true,
    },
  })
);

// Allowing body parsing
app.use(bodyParser.urlencoded({ extended: true }));

// set the template engine
app.set("view engine", "ejs");

// for serving static content
app.use(express.static("public"));

// Running a server
app.listen(port_server, () => {
  console.log(`Server running on port ${port_server} ! `);
});

// get for home page
app.get("/", (q, r) => {
  r.render("index");
});
// get for home page
app.get("/index", (q, r) => {
  r.render("index");
});

// get for login
app.get("/login", (q, r) => {
  console.log("into login");
  console.log(q.cookies.jwt);
  /*try {
    try{if (jwt.verify(q.cookies.jwt, "your-secret-key")) {
      r.redirect("Find_lawyer");
    }}
    catch(err){
      console.log("auth for user failed!");
    }
    try{
    if(jwt.verify(q.cookies.jwt, "my-secret-key")){
      r.redirect("lawyer_dashboard");
    }}
    catch(err){
      console.log("Auth for Lawyer failed!")
    }
    console.log("No match for jwt")
  } catch (error) {
    console.log(error)
    console.log("Coookie not found or incorrect JWT token");
  }*/
  r.render("login");
});

// get for contact_us
app.get("/contact_us", (q, r) => {
  r.render("contact_us");
});

// get for signup_lawyer
app.get("/signup_lawyer", (q, r) => {
  r.render("signup_lawyer");
});

// get for Find_lawyer
app.get("/Find_lawyer", async (q, r) => {
  console.log("\t\t\tinto Find_lawyer\n\n");
  console.log(`\t\t\t The cookie is  ${q.cookies._id} \n\n`);

  try {
    const lawyers = await lawyer_modal.find({});
    console.log(lawyers);
    await jwt.verify(q.cookies.jwt, "your-secret-key");
    r.render("Find_lawyer", { lawyers });
  } catch (error) {
    console.log(error);
    r.redirect("login");
  }
});

// get for signup
app.get("/signup", (q, r) => {
  r.render("signup");
});

// get for workspace
app.get("/connection_req", async (q, r) => {
  try {
    console.log("\t\t\tWS_page\n\n");
    console.log(q.cookies._id);
    if (q.cookies && q.cookies.jwt) {
      console.log("Cookies:", q.cookies.jwt);
    }
    console.log(q.cookies.jwt);
    await jwt.verify(q.cookies.jwt, "your-secret-key");
    
    const lawyers = await lawyer_modal.find({});
    const con=await Connection.find({user:q.cookies._id});
    r.render("connection_req", { lawyers ,con});
  } catch (error) {
    console.log(error);
    r.redirect("login");
  }
  //r.render('connection_req');
});

// get for logout
app.get("/logout", (q, r) => {
  q.session.destroy((err) => {
    if (err) {
      console.error(err);
      r.status(500).send("Internal Server Error");
    } else {
      r.clearCookie("jwt");
      r.redirect("/");
    }
  });
});

// get for logout
app.get("/logout_lawyer", (q, r) => {
  q.session.destroy((err) => {
    if (err) {
      console.error(err);
      r.status(500).send("Internal Server Error");
    } else {
      r.clearCookie("jwt");
      r.redirect("/");
    }
  });
});

// POST for Login
app.post("/login_post", async (q, r) => {
  const email_check = q.body.email;
  const pass_check = q.body.password;
  const user = await user_modal.findOne({ email_user: email_check });
  try {
    if (user.password === pass_check) {
      // Create a JWT token
      const token = await jwt.sign({ email: user.email }, "your-secret-key", {
        expiresIn: "24h",
      });
      await r.cookie("jwt", token, { httpOnly: true });
      await r.cookie("_id", email_check);
      r.redirect("connection_req");
    } else {
      console.log("\t\t\tProblem in login");
      r.status(404);
      r.render("login");
    }
  } catch (err) {
    console.log(err.message);
    r.redirect("/login");
  }
});

//POST for Signup Lawyer

app.post("/sign_up_lawyer", upload, async (q, r) => {
  const Fname = q.body.first_name;
  const Mname = q.body.middle_name;
  const Lname = q.body.last_name;

  const full_lawyer_name = Fname + " " + Mname + " " + Lname;
  const State_lawyer = q.body.State;
  const City_lawyer = q.body.City;
  const Full_address_lawyer = q.body.Address_lawyer;
  const pic_lawyer = q.body.url_lawyer;
  const phone_number_lawyer = q.body.Phonenumber_lawyer;
  const email = q.body.email;
  const nl = q.body.newsletters;
  const password = q.body.password;
  const res = await lawyer_modal.insertMany({
    full_lawyer_name: full_lawyer_name,
    State_lawyer: State_lawyer,
    City_lawyer: City_lawyer,
    Full_address_lawyer: Full_address_lawyer,
    pic_lawyer: pic_lawyer,
    phone_number_lawyer: phone_number_lawyer,
    email: email,
    password: password,
    nl: nl,
  });
  console.log(res);
  r.redirect("login");
});

// POST for Lawyer Login
app.post("/login_post_lawyer", async (q, r) => {
  try {
    //jwt.verify(q.cookies.jwt, "my-secret-key");
    //r.render("lawyer_dashboard",{});
  } catch (error) {}
  try {
    const pass_lawyer = q.body.password_lawyer;
    const email_lawyer = q.body.email_lawyer;
    const lawyer_check = await lawyer_modal.findOne({ email: email_lawyer });
    console.log(lawyer_check.password, "\t", pass_lawyer);
    if (lawyer_check.password == pass_lawyer) {
      const token = await jwt.sign({ email: email_lawyer }, "my-secret-key", {
        expiresIn: "24h",
      });
      await r.cookie("jwt", token, { httpOnly: true });
      await r.cookie("_id", email_lawyer);
      r.redirect("/lawyer_dashboard");
    } else {
      console.log("\t\t\tProblem in login Lawyer");
      //r.status(404);
      r.render("login");
    }
  } catch (err) {
    console.log(err.message);
    r.redirect("/login");
  }
});

//GET for lawyer dashboard
app.get("/lawyer_dashboard", async (q, r) => {
  try {
    //console.log("\t\t\tWS_page\n\n");
    //console.log(q.cookies._id);
    /*if (q.cookies && q.cookies.jwt) {
      console.log("Cookies:", q.cookies.jwt);
    }*/
    //console.log(q.cookies.jwt);
    await jwt.verify(q.cookies.jwt, "my-secret-key");
    //const properties = await property_modal.find({});
    console.log(q._id);
    const lawyer = await lawyer_modal.findOne({ email: q.cookies._id });
    r.render("dashboard", { lawyer });
  } catch (error) {
    console.log(error);
    r.redirect("login");
  }
});

app.get("/WS_rent", async (q, r) => {
  console.log("into WS_rent");
  try {
    console.log("\t\t\tWS_page\n\n");
    console.log(q.cookies._id);
    if (q.cookies && q.cookies.jwt) {
      console.log("Cookies:", q.cookies.jwt);
    }
    console.log(q.cookies.jwt);
    await jwt.verify(q.cookies.jwt, "your-secret-key");
    //const properties = await property_modal.find({});
    const lawyers = await lawyer_modal.find({});
    r.render("newsletters", { lawyers });
  } catch (error) {
    console.log(error);
    r.redirect("login");
  }
});

// POST for signup
app.post("/connection_req", async (q, r) => {
  console.log("\t\t\tInto signup\n");
  //fteching data
  const email = await q.body.email;
  const first_name = await q.body.first_name;
  const last_name = await q.body.last_name;
  const pass = await q.body.password;
  console.log(email, first_name, last_name, pass);
  const res = await user_modal.insertMany({
    first_user_name: first_name,
    last_user_name: last_name,
    password: pass,
    email_user: email,
  });
  r.redirect("login");
});

// POST for nodemailer Book request
app.post("/sendBookEmail", async (q, r) => {
  try {
    const { lawyerEmail } = q.body;
    const userEmail = q.cookies._id;
    const data = await lawyer_modal.findOne({ email: lawyerEmail });
    const user_data = await user_modal
      .findOne({ email_user: userEmail })
      .select("first_user_name last_user_name phone_number_user");
    console.log(data.full_lawyer_name);
    console.log(user_data.first_user_name);
    const mailOptions = {
      from: "noemi.schowalter6@ethereal.email",
      to: lawyerEmail,
      subject: "Request for Booking",
      html: `
    <p>Hello ${data.full_lawyer_name},</p>
    <p>We from Legal Bharat are hereby dropping this mail regrading a booking request with following detail:</p>
    <p><b>Name </b>: ${user_data.first_user_name} ${user_data.last_user_name}<p>
    <p><b>Email</b>: ${userEmail}<p>
    <h4><p>Please contact the client regarding the case details and other concerned factors.</p></h4>
    `,
    };
    const resultEmail = await transporter.sendMail(mailOptions);
    r.send("Email sent successfully");
  } catch (error) {
    r.send("Cannot sent mail");
  }
});

// POST for nodemailer consult
app.post("/sendConsultEmail", async (q, r) => {
  try {
    const { lawyerEmail } = q.body;
    const userEmail = q.cookies._id;
    const data = await lawyer_modal.findOne({ email: lawyerEmail });
    const user_data = await user_modal
      .findOne({ email_user: userEmail })
      .select("first_user_name last_user_name phone_number_user");
    console.log(data.full_lawyer_name);
    console.log(user_data.first_user_name);
    const mailOptions = {
      from: "noemi.schowalter6@ethereal.email",
      to: lawyerEmail,
      subject: `Request for Consultation from ${user_data.first_user_name} ${user_data.last_user_name}`,
      html: `
    <p>Hello ${data.full_lawyer_name},</p>
    <b>We from Legal Bharat are hereby dropping this mail regrading a consulting request with following detail:</b>
    <p><b>Name</b> : ${user_data.first_user_name} ${user_data.last_user_name}<p>
    <p><b>Email</b>: ${userEmail}<p>
    <b>Please contatct the requester ASAP and provide with the timming and required details for same.</b>
    `,
    };
    const resultEmail = await transporter.sendMail(mailOptions);
    r.send("Email sent successfully");
  } catch (error) {
    r.send("Cannot sent mail");
  }
});

// for connection request
app.post("/sendConReq", async (q, r) => {
  try {
    const lawyer_email = q.body.lawyerEmail;
    console.log("From sendConReq", lawyer_email);
    const user1 = await user_modal.findOne({ email_user: q.cookies._id });
    const lawyer1 = await lawyer_modal.findOne({ email: lawyer_email });

    const full_name = user1.first_user_name + " " + user1.last_user_name;

    Connection.insertMany({
      user: user1.email_user,
      u_name: full_name,
      connection: lawyer1.email,
      status: "pending",
    });

    console.log("Connection request send Successfully");

    r.send(`Request sent successfully to ${lawyer_email}`);
  } catch (err) {
    r.send(err.message);
  }
});

// for Connection Request page of Lawyer
app.get("/ConReqLawyer", async (q, r) => {
  const lawyerID = await lawyer_modal.findOne({ email: q.cookies._id });
  console.log(lawyerID);
  const users = await Connection.find({ connection: lawyerID.email });
  console.log(users);
  r.render("ConReqLawyer", { users });
});

// Accept
app.post("/sendAccept", async (q, r) => {
  try {
    const curr_lawyer_email = q.cookies._id;
    console.log(q.body.userEmail);
    await Connection.findOneAndUpdate(
      { connection: curr_lawyer_email, user: q.body.userEmail },
      { status: "accepted" },
      { new: true }
    );
    r.send(`Congrulations You made a new Connection ${q.body.userEmail} `);
  } catch (err) {
    r.send("Cannot Accept!");
  }
});

// Reject
app.post("/sendReject", async (q, r) => {
  try {
    const curr_lawyer_email = q.cookies._id;
    await Connection.findOneAndUpdate(
      { connection: curr_lawyer_email, user: q.body.userEmail },
      { status: "rejected" },
      { new: true }
    );
    r.send(`You Deleted an connection Request of ${q.body.userEmail} !`);
  } catch (error) {
    console.log(error.message);
    r.send("Unable to delete the connection");
  }
});

//for testing only
app.get("/test", async (q, r) => {
  r.send("Test");
});

// Page or resource not found
app.get("*", (q, r) => {
  r.status(404).send(`<h1>404 Not Found</h1>`);
});
