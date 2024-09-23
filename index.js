import express from "express";
import path from "path";
import bodyParser from "body-parser";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";
import jose from "node-jose";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());

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
const publicKeys = fs.readFileSync("public_key.pem", "utf8");

// Function to generate a digital signature
const generateSignature = async (data) => {
  const key = await jose.JWK.asKey(privateKey1, "pem");
  return jose.JWS.createSign({ format: "compact" }, key)
    .update(JSON.stringify(data))
    .final();
};
// Store client public keys
const clientPublicKeys = {}; // In-memory storage for simplicity

const sendFormWithSignature = async (clientEmail) => {
  const formData = "abc";
  const signature = await generateSignature(formData);
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

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "main.html"));
});

app.get("/send-form", (req, res) => {
  const clientEmail = process.env.CLIENTEMAIL;
  sendFormWithSignature(clientEmail);
  res.send("Form link sent to " + clientEmail);
});

const storeClientPublicKey = async (clientId, publicKey) => {
  const key = await jose.JWK.asKey(publicKey, "jwk");
  const publicKeyPem = key.toPEM();

  clientPublicKeys[clientId] = publicKeyPem;
};

app.post("/register-public-key", async (req, res) => {
  const { clientId, publicKey } = req.body;
  try {
    storeClientPublicKey(clientId, publicKey);
    res.send("Public key registered.");
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error converting key to PEM format.", error });
  }
});

const verifyClientSignature = (data, signature, publicKeyPem) => {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(data);
    verifier.end();

    const publicKeyBuffer = Buffer.from(publicKeyPem, "utf-8");
    return verifier.verify(publicKeyBuffer, signature, "base64");
  } catch (error) {
    console.error("Error during signature verification:", error);
    return false;
  }
};

const verifyServerSignature = async (data, signature, publicKeyPem) => {
  try {
    const pemKey = convertRsaToPem(publicKeyPem);
    const key = await jose.JWK.asKey(pemKey, "pem");

    const result = await jose.JWS.createVerify(key).verify(signature);
    const verifiedData = JSON.parse(result.payload.toString());
    return JSON.stringify(verifiedData) === JSON.stringify(data);
  } catch (err) {
    console.error("Verification failed:", err);
    return false;
  }
};
const convertRsaToPem = (rsaPublicKey) => {
  const publicKey = crypto.createPublicKey({
    key: rsaPublicKey,
    format: "pem",
    type: "pkcs1",
  });
  return publicKey.export({ type: "spki", format: "pem" });
};
// Submit form
app.post("/submit-form", async (req, res) => {
  const { clientId, data, clientSignature, serverSignature } = req.body;

  console.log("Received data for verification:", data);
  console.log("Client signature (Base64):", clientSignature);

  const clientPublicKeyJwk = clientPublicKeys[clientId];
  console.log("Client public key PEM:", clientPublicKeyJwk);
  if (!clientPublicKeyJwk) {
    return res
      .status(400)
      .json({ message: "Client public key not registered." });
  }

  try {
    // Ensure data is stringified and encoded properly
    const serverSignatureValid = await verifyServerSignature(
      "abc",
      serverSignature,
      publicKeys
    );
    if (!serverSignatureValid) {
      return res.status(401).json({ message: "Invalid server signature." });
    }

    // Ensure clientSignature is properly decoded before verification
    // const clientSignatureValid = await verifyClientSignature(
    //   JSON.stringify(data),
    //   clientSignature,
    //   clientPublicKeyJwk
    // );
    // if (!clientSignatureValid) {
    //   return res.status(401).json({ message: "Invalid client signature." });
    // }

    res.json({
      message: "Data received and signatures verified successfully.",
    });
  } catch (err) {
    console.error("Error during signature verification:", err);
    res
      .status(500)
      .json({ message: "Server error during signature verification." });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
