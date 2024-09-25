import crypto from "crypto";
import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import fs from "fs";
import dotenv from "dotenv";
const app = express();
app.use(express.json());
dotenv.config();

// Save keys to files or a database for later use, associating them with the clientId
const serverPublicKey = fs.readFileSync("public_key.pem", "utf-8");
const serverPrivateKey = fs.readFileSync("private_key.pem", "utf-8");
const serverSecretCode = "abcd";
const obj = {};
function generateKeysForClient(clientId, data) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048, // Key size
    publicKeyEncoding: {
      type: "pkcs1", // PKCS#1 for public key
      format: "pem", // PEM format
    },
    privateKeyEncoding: {
      type: "pkcs1", // PKCS#1 for private key
      format: "pem", // PEM format
    },
  });
  obj[clientId] = {
    data: data,
    publicKey: publicKey,
    privateKey: privateKey,
  };
  // array.push(obj);
  // return array;
  // console.log("object", obj);
  console.log("public-----=", publicKey);
  return { obj, data, privateKey, publicKey };
}
const sendFromWithSignature = async (clientEmail) => {
  const serverSignature = generateSignature(serverSecretCode, serverPrivateKey);
  const formLink = `http://localhost:4000?signature=${encodeURIComponent(
    serverSignature
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
    to: process.env.CLIENTEMAIL,
    subject: "secrue form Submission",
    text: `Please fill out the form using the following link: ${formLink}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent to:", clientEmail);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

app.get("/send-form", (req, res) => {
  const clientEmail = process.env.CLIENTEMAIL;
  sendFromWithSignature(clientEmail);
  res.send("Form link sent to " + clientEmail);
});

app.post("/register-clientID", async (req, res) => {
  const { clientId, signatureData } = req.body;
  const base64Signature = signatureData.split(",")[1]; // Removes the "data:image/png;base64," part
  const signatureBuffer = Buffer.from(base64Signature, "base64");
  if (!clientId || !signatureBuffer) {
    return res.status(403).json({
      success: false,
      message: "required a field",
    });
  }
  try {
    const { privateKey } = generateKeysForClient(clientId, signatureBuffer);

    const signature = generateSignature(signatureBuffer, privateKey);
    res.status(200).json({
      success: true,
      message: "success",

      signature,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "server error",
    });
  }
});

app.post("/submit-form", (req, res) => {
  const { clientId, signature, data, Alldata, serverSignature } = req.body;
  const base64Signature = data.split(",")[1];
  const signatureBuffer = Buffer.from(base64Signature, "base64");
  if (!clientId || !signature || !signatureBuffer || !Alldata) {
    return res.status(403).json({
      success: false,
      message: "All fields are required",
    });
  }

  try {
    const clientData = obj[clientId];

    if (!clientData) {
      console.log("clientId not found:", clientId);
      return res.status(404).json({
        success: false,
        message: "Client data not found.",
      });
    }

    const publicKey = clientData.publicKey;
    console.log("publicKey123", publicKey);

    if (!publicKey) {
      return res.status(401).json({
        success: false,
        message: "Public key not found for this clientId.",
      });
    }

    if (!verifySignature(signatureBuffer, signature, publicKey)) {
      return res.status(401).json({
        success: false,
        message: "Invalid signature.",
      });
    }
    if (!verifySignature(serverSecretCode, serverSignature, serverPublicKey)) {
      return res.status(401).json({
        success: false,
        message: "Invalid signature.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Data received and signatures verified successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

app.get("/", (req, res) => {
  console.log(process.cwd());
  res.sendFile(path.join(process.cwd(), "main.html"));
});

function generateSignature(data, privateKey) {
  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();

  const signature = sign.sign(privateKey, "base64");
  console.log("created Signature", signature);
  return signature;
}

const verifySignature = (data, signature, publicKey) => {
  const verifier = crypto.createVerify("SHA256");
  verifier.update(data);
  verifier.end();
  return verifier.verify(publicKey, signature, "base64");
};

app.listen(4000, () => {
  console.log("server is running on port 4000");
});
