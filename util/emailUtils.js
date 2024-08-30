
const nodemailer = require("nodemailer");


  const createTransporter = (user, pass) => {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      secure: false,
      port: 587, 
      logger: console, 
      debug: true, 
    });
  };

const sendEmail = async (transporter, mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};

module.exports = { createTransporter, sendEmail };
