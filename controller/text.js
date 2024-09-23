// import crypto from "crypto";

// export const text = async () => {
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
//   return { publicKeyJwk, privateKeyJwk };
// };
import { generateKeyPair } from "crypto";
import jose from "node-jose";

function pemToJwk(pemKey, isPrivate = false) {
  return jose.JWK.asKey(pemKey, "pem", { use: isPrivate ? "sig" : "enc" });
}
export function generateKeys() {
  return new Promise((resolve, reject) => {
    generateKeyPair(
      "rsa",
      {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      },
      async (err, publicKey, privateKey) => {
        if (err) {
          return reject(err);
        }

        try {
          // Convert PEM to JWK format using `node-jose`
          const publicKeyJwk = await pemToJwk(publicKey);
          const privateKeyJwk = await pemToJwk(privateKey, true);

          resolve({ publicKeyJwk, privateKeyJwk });
        } catch (convertError) {
          reject(convertError);
        }
      }
    );
  });
}
const { publicKeyJwk, privateKeyJwk } = await generateKeys();
console.log("Public Key (JWK):", publicKeyJwk);
console.log("Private Key (JWK):", privateKeyJwk);
