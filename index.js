import express from "express";
import path from "path";
import bodyParser from "body-parser";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());

// Generate and save RSA keys (only run once or use saved keys)
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "pkcs1",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs1",
    format: "pem",
  },
});

// Save keys to files if not already saved
fs.writeFileSync("private_key.pem", privateKey);
fs.writeFileSync("public_key.pem", publicKey);

// Load the private key from the file

const privateKey1 = fs.readFileSync("private_key.pem", "utf-8");

// Function to generate a digital signature
const generateSignature = (data) => {
  const signer = crypto.createSign("SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign(privateKey1, "base64");
  console.log("Generated Server Signature:", signature); // Debugging line
  return signature;
};

// Send form link with server signature via email
const sendFormWithSignature = async (clientEmail) => {
  const formData = "abc";
  const signature = generateSignature(formData);
  console.log("signature", signature);

  const formLink = `http://localhost:3000?signature=${encodeURIComponent(
    signature
  )}`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: clientEmail,
    subject: "Secure Form Submission",
    text: `Please fill out the form using the following link: ${formLink}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent to:", clientEmail);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Endpoint to serve the main form file
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "main.html"));
});

// Endpoint to send the form link to the client
app.get("/send-form", (req, res) => {
  const clientEmail = process.env.clientEmail;
  sendFormWithSignature(clientEmail);
  res.send("Form link sent to " + clientEmail);
});

// Function to verify a digital signature
const verifySignature = (data, signature) => {
  const verifier = crypto.createVerify("SHA256");
  verifier.update(data);
  verifier.end();
  return verifier.verify(publicKey, signature, "base64");
};

// Endpoint to handle form submissions
app.post("/submit-form", (req, res) => {
  const { data, clientSignature, serverSignature } = req.body;

  console.log("Received Data:", data);
  console.log("Received Client Signature:", clientSignature);
  console.log("Received Server Signature:", serverSignature);

  if (!clientSignature || !serverSignature) {
    return res
      .status(400)
      .json({ message: "Signatures are missing or invalid." });
  }
  // Verify server's original signature (validates form authenticity)
  if (!verifySignature("abc", serverSignature)) {
    return res.status(401).json({ message: "Invalid server signature." });
  }

  // Verify the client's signature
  if (!verifySignature(JSON.stringify(data), clientSignature)) {
    return res.status(401).json({ message: "Invalid client signature." });
  }

  console.log("Verified data:", data);
  res.json({ message: "Data received and signatures verified successfully." });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
