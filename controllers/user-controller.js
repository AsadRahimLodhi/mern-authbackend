const User = require("../model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const BASE_URL = process.env.BASE_URL;

const { createTransporter, sendEmail } = require("../util/emailUtils");
// Hard-coded email credentials
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const signup = async (req, res, next) => {
  const { name, email, password } = req.body;
  const frontendUrl = "http://localhost:5173";

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return res.status(500).json({ message: "Error finding user", error });
  }

  if (existingUser) {
    return res
      .status(400)
      .json({ message: "User already exists! Login instead." });
  }

  const hashPassword = bcrypt.hashSync(password);
  const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY, {
    expiresIn: "10m",
  });

  const user = new User({
    name,
    email,
    password: hashPassword,
    verificationToken,
    verificationTokenExpiry: Date.now() + 10 * 60 * 1000,
    // verificationTokenExpiry: Date.now() + (10 * 1000)
  });

  try {
    await user.save();

    const transporter = createTransporter(EMAIL_USER, EMAIL_PASS);

    const mailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: "Email Verification",
      html: `<p>Please verify your email by clicking <a href="${frontendUrl}/verify-email?token=${verificationToken}">here</a>.</p>`,
    };

    await sendEmail(transporter, mailOptions);

    return res.status(201).json({
      message:
        "User created successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  }
};

const verifyEmail = async (req, res, next) => {
  const { token } = req.query;
  console.log("Token received:", token);
  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }
  let user;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log("Decoded token:", decoded);

    user = await User.findOne({
      email: decoded.email,
      verificationToken: token,
    });
    console.log("User found:", user);
    if (!user || user.verificationTokenExpiry < Date.now()) {
      console.log("Verification token expired or user not found.");
      return res.status(400).json({
        message: "Verification token has expired. Please request a new one.",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;

    await user.save();
    console.log("User verification successful:", user);
    return res
      .status(200)
      .json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error("Error in token verification:", error);
    return res.status(400).json({ message: "Invalid or expired token", error });
  }
};

const resendVerificationEmail = async (req, res, next) => {
  const frontendUrl = "http://localhost:5173";
  console.log("backend run!");
  const { email } = req.body;
  let user;
  try {
    user = await User.findOne({ email });
  } catch (error) {
    return res.status(500).json({ message: "Error finding user", error });
  }

  if (!user || user.isVerified) {
    return res
      .status(400)
      .json({ message: "User not found or already verified" });
  }

  const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY, {
    expiresIn: "10m",
  });
  user.verificationToken = verificationToken;
  user.verificationTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes in milliseconds;

  try {
    await user.save();

    const transporter = createTransporter(EMAIL_USER, EMAIL_PASS);
    const mailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: "Email Verification",
      html: `<p>Your previous verification link expired. Please verify your email by clicking <a href="${frontendUrl}/verify-email?token=${verificationToken}">here</a>.</p>`,
    };
    await sendEmail(transporter, mailOptions);

    return res.status(200).json({
      message: "New verification email sent. Please check your email.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error sending email", error: error.message });
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return new Error(error);
  }

  if (!existingUser) {
    return res.status(400).json({ message: "User not found. signUp Please" });
  }
  if (!existingUser.isVerified) {
    return res
      .status(400)
      .json({ message: "Please verify your email before logging in." });
  }
  const isPasswordCorrect = bcrypt.compareSync(password, existingUser.password);
  if (!isPasswordCorrect) {
    return res.status(400).json({ message: "Invalid Email / Password" });
  } else {
    const token = jwt.sign(
      { id: existingUser._id },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "10m",
      }
    );
    res.cookie(String(existingUser._id), token, {
      path: "/",
      // expires: new Date(Date.now() + 35 * 1000),
      expires: new Date(Date.now() + 10 * 60 * 1000),
      httpOnly: true,
      sameSite: "lax",
    });
    return res
      .status(200)
      .json({ message: "Login successfully", user: existingUser, token });
  }
};

const verifyToken = (req, res, next) => {
  const cookies = req.headers.cookie;
  if (!cookies) {
    return res.status(404).json({ message: "No Token Found" });
  }
  const token = cookies.split("=")[1];
  jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(400).json({ message: "Invalid Token" });
    }
    req.id = user.id;
    next();
  });
};

const getUser = async (req, res, next) => {
  const userId = req.id;
  let user;
  try {
    user = await User.findById(userId, "-password");
  } catch (error) {
    return new Error(error);
  }
  if (!user) {
    return res.status(404).json({ message: "User Not Found" });
  }
  return res.status(200).json({ user });
};

const refreshToken = (req, res, next) => {
  const cookies = req.headers.cookie;
  console.log(cookies);
  const prevToken = cookies.split("=")[1];
  if (!prevToken) {
    return res.status(400).json({ message: "Couldn't find token" });
  }
  jwt.verify(String(prevToken), process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Authentication failed" });
    }
    res.clearCookie(String(user.id));
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "10m",
    });
    res.cookie(String(user.id), token, {
      path: "/",
      expires: new Date(Date.now() + 1000 * 60 * 10),
      httpOnly: true,
      sameSite: "lax",
    });
    req.id = user.id;
    next();
  });
};

const logout = (req, res, next) => {
  const cookies = req.headers.cookie;
  const prevToken = cookies.split("=")[1];
  if (!prevToken) {
    return res.status(400).json({ message: "Couldn't find token" });
  }
  jwt.verify(String(prevToken), process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Authentication failed" });
    }
    res.clearCookie(String(user.id));
    return res.status(200).json({ message: "Successfully Logged out" });
  });
};

module.exports = {
  signup,
  login,
  verifyEmail,
  verifyToken,
  getUser,
  refreshToken,
  logout,
  resendVerificationEmail,
};
