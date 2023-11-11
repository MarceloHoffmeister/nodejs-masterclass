/*
* Request handlers
* */

// Dependencies
const _data = require('./data')
const helpers = require('./helpers')

// Define the handlers
handlers = {}

// Users
handlers.users = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete']

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else {
        callback(405)
    }
}

// Container for the users submethods
handlers._users = {}

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
handlers._users.post = function (data, callback) {
    // Check that all required fields are filled out
    const rawFirstName = data.payload.firstName
    const firstName = typeof(rawFirstName) === 'string' && rawFirstName.trim().length > 0 ? rawFirstName.trim() : false

    const rawLastName = data.payload.lastName
    const lastName = typeof(rawLastName) === 'string' && rawLastName.trim().length > 0 ? rawLastName.trim() : false

    const rawPhone = data.payload.phone
    const phone = typeof(rawPhone) === 'string' && rawPhone.trim().length > 10 ? rawPhone.trim() : false

    const rawPassword = data.payload.password
    const password = typeof(rawPassword) === 'string' && rawPassword.trim().length > 0 ? rawPassword.trim() : false

    const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user doesn't already exist
        _data.read('users', phone, function (err, data) {
            if (err) {
                // Hash the password
                const hashedPassword = helpers.hash(password)

                if (hashedPassword) {
                    // Create the user object
                    const userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    }

                    // Store the user
                    _data.create('users', phone, userObject, function (err) {
                        if (!err) {
                            callback(200)
                        } else {
                            console.log(err)
                            callback(500, {'Error': 'A user with that phone number already exists'})
                        }
                    })
                } else {
                    callback(500, {'Error': "Could not hash the user's password"})
                }
            } else {
                // User already exist
                callback(400, {'Error': 'A user with that phone number already exist'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
}

// Users - get
// Require data: phone
// Option data: none
handlers._users.get = function (data, callback) {
    // Check that the phone number is valid
    const rawPhone = data.queryStringObject.phone
    const phone = typeof(rawPhone) === 'string' && rawPhone.trim().length > 10 ? rawPhone.trim() : false

    if (phone) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false

        // Verify tha the given token is valid for the phone number
        handlers.tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, function (err, data) {
                    if (!err && data) {
                        // Remove the hashed password from the user object before returning it to the requester
                        delete data.hashedPassword

                        callback(200, data)
                    } else {
                        callback(404)
                    }
                })
            } else {
                callback(403, {'Error': 'Missing required token in header, or token is invalid'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function (data, callback) {
    // Check for the required field
    const rawPhone = data.payload.phone
    const phone = typeof(rawPhone) === 'string' && rawPhone.trim().length > 10 ? rawPhone.trim() : false

    // Check for the optional fields
    const rawFirstName = data.payload.firstName
    const firstName = typeof(rawFirstName) === 'string' && rawFirstName.trim().length > 0 ? rawFirstName.trim() : false

    const rawLastName = data.payload.lastName
    const lastName = typeof(rawLastName) === 'string' && rawLastName.trim().length > 0 ? rawLastName.trim() : false

    const rawPassword = data.payload.password
    const password = typeof(rawPassword) === 'string' && rawPassword.trim().length > 0 ? rawPassword.trim() : false

    // Error if the phone is invalid
    if (phone) {
        // Error if nothing is sent to update
        if (firstName || lastName || password) {
            // Get the token from the headers
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false

            // Verify tha the given token is valid for the phone number
            handlers.tokens.verifyToken(token, phone, function (tokenIsValid) {
                if (tokenIsValid) {
                    // Lookup the user
                    _data.read('users', phone, function (err, userData) {
                        if (!err && userData) {
                            // Update the fields necessary
                            if (firstName) {
                                userData.firstName = firstName
                            }

                            if (lastName) {
                                userData.lastName = lastName
                            }

                            if (password) {
                                userData.hashedPassword = helpers.hash(password)
                            }

                            // Store the new updates
                            _data.update('users', phone, userData, function (err) {
                                if (!err) {
                                    callback(200)
                                } else {
                                    console.log(err)
                                    callback(500, {'Error': 'Could not update the user'})
                                }
                            })
                        } else {
                            callback(400, {'Error': "The specified user doesn't exist"})
                        }
                    })
                } else {
                    callback(403, {'Error': 'Missing required token in header, or token is invalid'})
                }
            })
        } else {
            callback(400, {'Error': 'Missing fields to update'})
        }
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Users - delete
// Required field: phone
handlers._users.delete = function (data, callback) {
    // Check that the phone number is valid
    const rawPhone = data.queryStringObject.phone
    const phone = typeof(rawPhone) === 'string' && rawPhone.trim().length > 10 ? rawPhone.trim() : false

    if (phone) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false
        console.log(phone, token)
        // Verify tha the given token is valid for the phone number
        handlers.tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, function (err, data) {
                    if (!err && data) {
                        _data.delete('users', phone, function (err) {
                            if (!err) {
                                callback(200)
                            } else {
                                callback(400, {'Error': 'Could not delete the specified user'})
                            }
                        })
                    } else {
                        callback(400, {'Error': 'Could not find the specified user'})
                    }
                })
            } else {
                callback(403, {'Error': 'Missing required token in header, or token is invalid'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Users
handlers.tokens = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete']

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback)
    } else {
        callback(405)
    }
}

// Container for all the tokens methods
handlers._tokens = {}

// Tokens - post
// Required data: phone password
// Optional data: none
handlers._tokens.post = function (data, callback) {
    const rawPhone = data.payload.phone
    const phone = typeof(rawPhone) === 'string' && rawPhone.trim().length > 10 ? rawPhone.trim() : false

    const rawPassword = data.payload.password
    const password = typeof(rawPassword) === 'string' && rawPassword.trim().length > 0 ? rawPassword.trim() : false

    if (phone && password) {
        // Look up the user who matches that phone number
        _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
                // Hash the sent password, and compare it to the password stored in the user object
                const hashedPassword = helpers.hash(password)

                if (hashedPassword === userData.hashedPassword) {
                    // If valid, create a new token with random name. Set expiration data 1 hour in the future
                    const tokenId = helpers.createRandomString(20)
                    const expires = Date.now() + 1000 * 60 * 60
                    const tokeObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    }

                    // Store the token
                    _data.create('tokens', tokenId, tokeObject, function (err) {
                        if (!err) {
                            callback(200, tokeObject)
                        } else {
                            callback(500, {'Error': 'Could not create the new token'})
                        }
                    })
                } else {
                    callback(400, {'Error': "Password did not match the specified user's stored password"})
                }
            } else {
                callback(400, {'Error': 'Could not find the specified user'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
}

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function (data, callback) {
    // Check that the id is valid
    const rawId = data.queryStringObject.id
    const id = typeof(rawId) === 'string' && rawId.trim().length === 20 ? rawId.trim() : false

    if (id) {
        // Lookup the token
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData)
            } else {
                callback(404)
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }

}

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
    const rawId = data.payload.id
    const id = typeof(rawId) === 'string' && rawId.trim().length === 20 ? rawId.trim() : false

    const rawExtend = data.payload.extend
    const extend = typeof (rawExtend) === 'boolean' && rawExtend === true

    if (id && extend) {
        // Lookup the token
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                // Check to the make sure the token isn't already expired
                if (tokenData.expires > Date.now()) {
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60

                    // Store the new updates
                    _data.update('tokens', id, tokenData, function (err) {
                        if (!err) {
                            callback(200)
                        } else {
                            callback(500, {'Erro': "Could not update the token's expiration"})
                        }
                    })
                } else {
                    callback(400, {'Error': 'The token has already expired, and cannot be extended'})
                }
            } else {
                callback(400, {'Error': 'Specified token does not exist'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field(s) or field(s) are invalid'})
    }
}

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
    // Check that the id is valid
    const rawId = data.queryStringObject.id
    const id = typeof(rawId) === 'string' && rawId.trim().length === 20 ? rawId.trim() : false

    if (id) {
        _data.read('tokens', id, function (err, data) {
            if (!err && data) {
                _data.delete('tokens', id, function (err) {
                    if (!err) {
                        callback(200)
                    } else {
                        callback(400, {'Error': 'Could not delete the specified token'})
                    }
                })
            } else {
                callback(400, {'Erro': 'Could not find the specified token'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Verify if a given id is currently valid for a given user
handlers.tokens.verifyToken = function (id, phone, callback) {
    // Lookup the token
    _data.read('tokens', id, function (err, tokenData) {
        console.log(id, phone, tokenData)
        if (!err && tokenData) {
            // Check that the token is for the given user and has not expired
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true)
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    })
}

// Ping handler
handlers.ping = function (data, callback) {
    callback(200)
}

handlers.notFound = function (data, callback) {
    callback(404)
}

// Export the module
module.exports = handlers