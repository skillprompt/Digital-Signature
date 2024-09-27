# Digital Signature

A digital signature is an electronic, encrypted stamp of authentication on digital information such as email messages or electronic documents. It allows the recipient to confirm the identity of the sender, and the item or file hasn’t been changed by another party.

Digital signatures typically use public key cryptography, where a private key is used to create the signature, and a corresponding public key is used to verify it.

## Build a Digital Signature using Node js

I have use build in module of node js i.e crypto for key generation.

## Purpose

This code is designed to facilitate the secure submission of a form with digital signatures using both client-side and server-side cryptography. The core purposes include:

#### 1. Client-Side Signature Generation:

When a user fills out a form, they also provide a digital signature using a signature pad. The signature is encoded as a base64 image (data:image/png;base64).
The client generates its own RSA key pair and uses the private key to sign the form data. This ensures that the form has been genuinely signed by the client.

#### 2. Server-Side Signature Verification:

The server generates its own RSA key pair and uses its private key to sign a secret code (serverSecretCode). This signature is included in the form URL sent to the client via email.
When the client submits the form, both the client's signature and the server's signature are sent back to the server.
The server verifies both signatures:
The client's signature is verified using the public key that the client registered.
The server's own signature is verified using the stored public key to ensure the form came from a trusted source.

#### 3. Secure Email Form Distribution:

A signed link is sent to the client via Gmail using nodemailer. The link contains the server's signature, ensuring the authenticity of the form.

#### 4. Data Integrity and Authenticity:

The code ensures that both the client's and server's signatures are validated before accepting any form data. This helps in maintaining the integrity and authenticity of the submitted information.

## Flow

- At first server has it own asymmetric key and secretCode, generate a serverSignature using private keys. This signature is attached to the formURL.

- There is an Api called send-form which uses a nodemailer to send a FormUrl to the client.

- Client click the formUrl, fill and hit the submit button there is an two api call (register-clientId && submit-form)

#### Register-clientId

- In this api client send a clientId and signatureImg to the server and server generate asymmetric keys, saves to the clientId object.

- Generate a clientSignature using privatekeys and signatureImg and send clientSignature to the client as a Response.

#### Register-clientId

- This api takes a Data, clientId, clientSignature, serverSignature get from a formUrl params and send to server.

- Server verify this signature by calling verifySignature()

## Starts

To run this code, run the following command

## npm

```bash
npm run dev
```

## yarn

```bash
yarn dev
```
