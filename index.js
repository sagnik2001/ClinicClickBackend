const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const cron = require("node-cron")

//Doc routes
const DocRegisterRoute = require("./routes/Docs/Auth/register");
const DocLogInRoute = require("./routes/Docs/Auth/login");
const DocUpdateInfo = require("./routes/Docs/Info/DoctorInfo");
//patient routes
const PatientRegister = require("./routes/Patient/Auth/Register");
const PatientLogin = require("./routes/Patient/Auth/Login");
const Patientinfo = require("./routes/Patient/Info/PatientInfo");
const ReviewRoutes = require("./routes/Patient/Reviews/Review");
//appointment routes
const AppointmentRoutes = require("./routes/Appointments/Appointments");
const SendInvite = require("./routes/Patient/AddDoc/AddDoc");
const NotificationRoutes = require("./routes/Notifications/Notifications");
//chat routes
const conversationRoutes = require("./routes/Chat/conversations");
const messageRoute = require("./routes/Chat/messages");
const Sessions = require("./models/Sessions");
const { handleRefreshToken, logoutcontroller } = require("./controllers/Docs/Auth/logincontroller");
dotenv.config();

app.use(cors());

const URL = process.env.localhost || 5000;

// For using static files

mongoose.connect(
  process.env.MONGODB_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log("Connected to Database");
  },
);

// MiddleWares
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));
app.use(express.urlencoded({ extended: true }));


// Remove the access tokens daily cron job

cron.schedule('0 0 * * *', async () => {
  try {
    await Sessions.updateMany({}, {
      $pull: {
        accessTokens: {
          expiresAt: { $lt: new Date() } // Remove tokens where expiresAt is less than the current date
        }
      }
    })
    console.log("Expired tokens cleanup completed")
  } catch (error) {
    console.error("Error during expired tokens cleanup", error)
  }
})

// For Refresh jwt token

app.post("/refreshToken", handleRefreshToken)

// For Docs

app.use("/doc", DocRegisterRoute);
app.use("/doc", DocLogInRoute);
app.use("/doc", DocUpdateInfo);
app.use("/doc", SendInvite);


// For Notifications

app.use("/notification", NotificationRoutes);

// For Appointments

app.use("/appointment", AppointmentRoutes);
//chat
app.use("/chat/conversations", conversationRoutes);
app.use("/chat/messages", messageRoute);
// For Patients
app.use("/patient", PatientRegister);
app.use("/patient", PatientLogin);
app.use("/patient", Patientinfo);
app.use("/review", ReviewRoutes);


// For Logoutting the user

app.post("/logout", logoutcontroller)

app.listen(URL, () => {
  console.log("Server is running");
});


