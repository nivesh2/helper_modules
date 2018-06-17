/**
 * Helper method for cryptography module
 */
const crypto = require('crypto')
const path = require('path')

function main() {
  const algorithm = 'aes-256-ecb'
  const privateKey = require('fs').readFileSync(path.resolve(`${__dirname}/../../keys/Private_key.pem`), 'utf-8')
  const publicKey = require('fs').readFileSync(path.resolve(`${__dirname}/../../keys/Public_key.pub`), 'utf-8')
  const VendorPublicKey = require('fs').readFileSync(path.resolve(`${__dirname}/../../keys/Vendor_Public_key.pem`), 'utf-8')

  return {
    encryptStringAES(text, key) {
      const keybuffer = Buffer.from(key)
      const iv = Buffer.from('')
      const cipher = crypto.createCipheriv('aes-256-ecb', keybuffer, iv)
      let result = cipher.update(text, 'utf8', 'base64')
      result += cipher.final('base64')
      return result
    },
    decryptStringAES(text, key) {
      const decipher = crypto.createDecipher(algorithm, key)
      let dec = decipher.update(text, 'base64', 'utf8')
      dec += decipher.final('utf8')
      return dec
    },
    encryptStringWithRsaPublicKey(toEncrypt) {
      const buffer = Buffer.from(toEncrypt)
      const encrypted = crypto.publicEncrypt(VendorPublicKey, buffer)
      return encrypted.toString('base64')
    },
    decryptStringWithRsaPrivateKey(toDecrypt) {
      const buffer = Buffer.from(toDecrypt, 'base64')
      const decrypted = crypto.privateDecrypt(privateKey, buffer)
      return decrypted.toString('utf8')
    },
    signRequestData(dataToSign) {
      const sign = crypto.createSign('RSA-SHA1')

      sign.write(dataToSign)
      sign.end()

      const encryptedText = sign.sign(privateKey, 'base64')
      return encryptedText
    },
    verifyResponseData(dataToVerify, encryptedData) {
      const verify = crypto.createVerify('RSA-SHA1')

      verify.write(dataToVerify)
      verify.end()

      return verify.verify(VendorPublicKey, encryptedData, 'base64')
    },
    verifyRequestData(dataToVerify, encryptedData) {
      const verify = crypto.createVerify('RSA-SHA1')

      verify.write(dataToVerify)
      verify.end()

      return verify.verify(publicKey, encryptedData, 'base64')
    },
    random32Bytes() {
      return crypto.randomBytes(32)
    },
  }
}

module.exports = main()