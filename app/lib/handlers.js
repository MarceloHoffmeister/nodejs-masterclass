/*
* Request handlers
* */

// Dependencies
const _data = require('./data')
const helpers = require('./helpers')

// Define the handlers
handlers = {}

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
// TODO Only let an authenticated user access theis object. Don't let them access anyone else's
handlers._users.get = function (data, callback) {
    // Check that the phone number is valid
    const rawPhone = data.queryStringObject.phone
    const phone = typeof(rawPhone) === 'string' && rawPhone.trim().length > 10 ? rawPhone.trim() : false

    if (phone) {
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
        callback(400, {'Error': 'Missing required field'})
    }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// TODO Only let an authenticated user access theis object. Don't let them access anyone else's
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
            callback(400, {'Error': 'Missing fields to update'})
        }
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Users - delete
// Required field: phone
// TODO Only let an authenticated user delete their object. Don't let them delete anyone
// TODO Cleanup (delete) any other data files associated with the user
handlers._users.delete = function (data, callback) {
    // Check that the phone number is valid
    const rawPhone = data.queryStringObject.phone
    const phone = typeof(rawPhone) === 'string' && rawPhone.trim().length > 10 ? rawPhone.trim() : false

    if (phone) {
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
                callback(400, {'Erro': 'Could not find the specified user'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
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