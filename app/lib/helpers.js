/*
* Helpers for various tasks
* */

// Dependencies
const crypto = require('crypto')
const config = require('./config')
const https = require('https')
const querystring = require('querystring')
const path = require('path')
const fs = require('fs')

// Container for the helpers
const helpers = {}

// Create a SHA256 hash
helpers.hash = function (str) {
    if (typeof(str) === 'string' && str.length > 0) {
        return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
    } else {
        return false
    }
}

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function (str) {
    try {
        return JSON.parse(str)
    } catch (e) {
        return {}
    }
}

// Create a string of random alphanumeric characters, of a give length
helpers.createRandomString = function (strLength) {
    strLength = typeof (strLength) === 'number' && strLength > 0 ? strLength : false

    if (strLength) {
        // Define all the possible characters that could go into a string
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

        // Start the final string
        let str = ''

        for (let i = 1; i <= strLength; i++) {
            // Get a random character from the possibleCharacters string
            const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))

            // Append this character to the final string
            str += randomCharacter
        }

        // Return the final string
        return str
    } else {
        return false
    }
}

// Send a SMS message via Twilio
helpers.sendTwilioSms = function (phone, msg, callback) {
    // Validate parameters
    phone = typeof(phone) === 'string' /*&& phone.trim().length === 10*/ ? phone.trim() : false
    msg = typeof(msg) === 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false

    if (phone && msg) {
        // Configure the request payload
        const payload = {
            'From': config.twilio.fromPhone,
            'To': `+55${phone}`,
            'Body': msg
        }

        // Stringify the payload
        const stringPayload = querystring.stringify(payload)

        // Configure the request details
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        }

        // Instantiate the request object
        const req = https.request(requestDetails, function (res) {
            // Grab the status of the sent request
            const status = res.statusCode

            // Callback successfully if the request went through
            if (status === 200 || status === 201) {
                callback(false)
            } else {
                callback(`Status code returned was ${status}`)
            }
        })

        // Bind to the error event, so it doesn't get thrown
        req.on('error', function (e) {
            callback(e)
        })

        // Add the payload
        req.write(stringPayload)

        // End the request
        req.end()
    } else {
        callback('Given parameters were missing or invalid')
    }
}

// Get the string content of a template
helpers.getTemplate = function (templateName, data, callback) {
    templateName = typeof (templateName) === 'string' && templateName.length > 0 ? templateName : false
    data = typeof(data) === 'object' && data !== null ? data : {}

    if (templateName) {
        const templatesDir = path.join(__dirname, '/../templates/')

        fs.readFile(`${templatesDir}${templateName}.html`, 'utf8', function (err, str) {
            if (!err && str) {
                // Do interpolation on the string
                const finalString = helpers.interpolate(str, data)

                callback(false, finalString)
            } else {
                callback('No template could be found')
            }
        })
    } else {
        callback('A valid template name was not specified')
    }
}

// Add the universal header and footer to a string, and pass provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = function (str, data, callback) {
    str = typeof(str) === 'string' && str.length > 0 ? str : ''
    data = typeof(data) === 'object' && data !== null ? data : {}

    // Get the header
    helpers.getTemplate('_header', data, function (err, headerString) {
        if (!err && headerString) {
            // Get the footer
            helpers.getTemplate('_footer', data, function (err, footerString) {
                if (!err && footerString) {
                    // Add them all together
                    const fullString = `${headerString}${str}${footerString}`

                    callback(false, fullString)
                } else {
                    callback('Could not find the footer template')
                }
            })
        } else {
            callback('Could not find the header template')
        }
    })
}

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = function (str, data) {
    str = typeof(str) === 'string' && str.length > 0 ? str : ''
    data = typeof(data) === 'object' && data !== null ? data : {}

    // Add the templateGlobals to the data object, prepending their key name with "global"
    for (const keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data[`global.${keyName}`] = config.templateGlobals[keyName]
        }
    }

    // For each key in the data object, insert its value into the string at the corresponding placeholder
    for (const key in data) {
        if (data.hasOwnProperty(key) && typeof(data[key]) === 'string') {
            const replace = data[key]
            const find = `{${key}}`
            str = str.replace(find, replace)
        }
    }

    return str
}

// Export the module
module.exports = helpers