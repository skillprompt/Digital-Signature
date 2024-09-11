import express from "express";
import path from "path";
import bodyParser from "body-parser";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";
import { webcrypto } from "node:crypto";

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
  return signer.sign(privateKey1, "base64");
};

// Store client public keys
const clientPublicKeys = {}; // In-memory storage for simplicity

// Send form link with server signature via email
const sendFormWithSignature = async (clientEmail) => {
  const formData = "abc";
  const signature = generateSignature(formData);
  console.log("generate signatures", signature);
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
  const clientEmail = process.env.CLIENTEMAIL;
  sendFormWithSignature(clientEmail);
  res.send("Form link sent to " + clientEmail);
});

// Endpoint to register client public key
app.post("/register-public-key", async (req, res) => {
  const { clientId, publicKey } = req.body;

  // Import the public key from JWK format
  const publicKeyObj = await webcrypto.subtle.importKey(
    "jwk",
    publicKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    true,
    ["verify"]
  );

  clientPublicKeys[clientId] = publicKeyObj;
  res.send("Public key registered.");
});

// Function to verify a digital signature
const verifySignature = (data, signature, publicKey) => {
  const verifier = crypto.createVerify("SHA256");
  verifier.update(data);
  verifier.end();
  return verifier.verify(publicKey, signature, "base64");
};

// Endpoint to handle form submissions
app.post("/submit-form", (req, res) => {
  const { clientId, data, clientSignature, serverSignature } = req.body;
  console.log("Received Data:", data);
  console.log("Received clientId:", clientId);
  console.log("Received Client Signature:", clientSignature);
  console.log("Received Server Signature:", serverSignature);

  const clientPublicKey = clientPublicKeys[clientId];
  if (!clientPublicKey) {
    return res
      .status(400)
      .json({ message: "Client public key not registered." });
  }

  // Verify server's original signature
  if (!verifySignature("abc", serverSignature, publicKey)) {
    return res.status(401).json({ message: "Invalid server signature." });
  }

  // Verify the client's signature
  if (
    !verifySignature(JSON.stringify(data), clientSignature, clientPublicKey)
  ) {
    return res.status(401).json({ message: "Invalid client signature." });
  }

  res.json({ message: "Data received and signatures verified successfully." });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
