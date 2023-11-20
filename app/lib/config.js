/*
* Create and export configuration variables
* */

// Container for all the environments
const environments = {}

// Staging (default) environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'AC6f10cfd98b58f9d819f0c80579027c27',
        'authToken': '1586d617e7d34b63cdde6821261933a2',
        'fromPhone': '+15614139468',
    }
}

// Production environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'thisIsAlsoASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': '',
        'authToken': '',
        'fromPhone': '',
    }
}

// Determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : ''

// Check that the current environment is one of the environments above, if not, default to staging
const environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging

// Export the module
module.exports = environmentToExport