const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto")
const requestIp = require("request-ip")
const Doctors = require("../../../models/Doctors");
const Sessions = require("../../../models/Sessions");
const hashDeviceId = (deviceId) => crypto.createHash('sha256').update(deviceId).digest('hex');


const logincontroller = async (req, res) => {
  try {
    const user = await Doctors.findOne({ email: req.body.email });

    if (!user) return res.status(404).json("User Not Found");

    // if (!user.verified) return res.status(403).json("Email is not verified");

    const password = await bcrypt.compare(req.body.password, user.password);
    if (!password) return res.status(403).json("Password Doesnt Match");

    const clientIp = requestIp.getClientIp(req);
    console.log(clientIp, 'client')

    const hashedDeviceId = hashDeviceId(clientIp);
    const jwttoken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    }); // generating a JWT token with payload of the user id

    const tokenExpiration = new Date(new Date().getTime() + (60 * 60 * 1000));

    const tokenDoc = {
      token: jwttoken,
      expiresAt: tokenExpiration
    }

    let session = await Sessions.findOne({ userId: user._id, deviceId: hashedDeviceId })

    if (session) {
      // check if there already exists 
      session.accessTokens.push(tokenDoc)
    }
    else {
      session = new Sessions({
        userId: user._id,
        deviceId: hashedDeviceId,
        accessTokens: [tokenDoc]
      })
    }
    await session.save()


    // await new Session({ userId: user._id, , deviceId: hashedDeviceId }).save();

    return res.status(200).json({
      token: jwttoken,
      user: user,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json(error.message);
  }
};


const handleRefreshToken = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const clientIp = requestIp.getClientIp(req);
    const hashedDeviceId = hashDeviceId(clientIp);


    if (!authHeader) return res.status(400).json("Auth token is not provided");


    const token = authHeader.split(" ")[1];

    const decodedtoken = jwt.decode(token);

    if (!decodedtoken) {
      return res.status(400).json("Wrong Auth token");
    }

    // console.log(decodedtoken)

    const session = await Sessions.findOne({ userId: decodedtoken._id, deviceId: hashedDeviceId });

    if (!session) {
      return res.status(401).send({ message: 'Session not found. Please sign in again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY, { ignoreExpiration: true }); // ignoreExpiration to proceed with expired tokens

    const date = Date.now().valueOf() / 1000; // convert it in millisec

    if (typeof decoded.exp !== 'undefined' && decoded.exp >= date) {
      return res.status(401).send({ message: "Token has not already expired." });
    }




    const newAccessToken = jwt.sign({ _id: decodedtoken._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    }); // generating a JWT token with payload of the user id

    const tokenExpiration = new Date(new Date().getTime() + (60 * 60 * 1000));

    session.accessTokens.push({ token: newAccessToken, expiresAt: tokenExpiration });
    await session.save();

    return res.status(200).json({ msg: "Your prev token expired.New token generated", accessToken: newAccessToken });

  } catch (error) {
    console.log(error)
    res.status(500).json(error.message);
  }
}

const logoutcontroller = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const clientIp = requestIp.getClientIp(req);
    const hashedDeviceId = hashDeviceId(clientIp);
    if (!authHeader) return res.status(400).json("Auth token is not provided");


    const token = authHeader.split(" ")[1];

    const decodedtoken = jwt.decode(token);

    if (!decodedtoken) {
      return res.status(400).json("Wrong Auth token");
    }

    const session = await Sessions.findOne({ userId: decodedtoken._id, deviceId: hashedDeviceId });

    if (!session) {
      return res.status(401).send({ message: 'Session not found. Please sign in again.' });
    }

    await Sessions.updateOne({}, {
      $pull: {
        accessTokens: {
          token: token// Remove tokens where expiresAt is less than the current date
        }
      }
    })

    return res.status(201).json({ msg: "Logout successfully" })

  } catch (error) {
    console.log(error)
    res.status(500).json(error.message);
  }
}

module.exports = { logincontroller, handleRefreshToken, logoutcontroller };
