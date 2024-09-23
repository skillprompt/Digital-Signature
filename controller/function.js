// import crypto from "crypto";
// const GenerateClientKeys = async () => {
//   const cryptoKeyPair = await crypto.subtle.generateKey(
//     {
//       name: "RSASSA-PKCS1-v1_5",
//       modulusLength: 2048,
//       publicExponent: new Uint8Array([1, 0, 1]),
//       hash: { name: "SHA-256" },
//     },
//     true,
//     ["sign", "verify"]
//   );

//   // Export keys to JWK format
//   const publicKeyJwk = await crypto.subtle.exportKey(
//     "jwk",
//     cryptoKeyPair.publicKey
//   );
//   const privateKeyJwk = await crypto.subtle.exportKey(
//     "jwk",
//     cryptoKeyPair.privateKey
//   );
//   console.log("debbugging");
//   return { publicKeyJwk, privateKeyJwk };
// };

// GenerateClientKeys();

import { text } from "./text.js";
const { publicKeyJwk, privateKeyJwk } = text();

console.log(publicKeyJwk);
console.log(privateKeyJwk);
