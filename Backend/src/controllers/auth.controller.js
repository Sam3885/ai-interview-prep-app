const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")
const mongoose = require("mongoose")

const memoryUsersByEmail = new Map()
const memoryUsersByUsername = new Map()

function isDatabaseConnected() {
    return mongoose.connection.readyState === 1
}

function signUserToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username, email: user.email },
        process.env.JWT_SECRET || "dev-jwt-secret",
        { expiresIn: "1d" }
    )
}

function getTokenCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production"

    return {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
    }
}

function setTokenCookie(res, token) {
    res.cookie("token", token, {
        ...getTokenCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000
    })
}

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {

    const { username, email, password } = req.body

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Please provide username, email and password"
        })
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        })
    }

    if (!isDatabaseConnected()) {
        const isUserAlreadyExists = memoryUsersByEmail.has(email) || memoryUsersByUsername.has(username)

        if (isUserAlreadyExists) {
            return res.status(400).json({
                message: "Account already exists with this email address or username"
            })
        }

        const user = {
            _id: Date.now().toString(),
            username,
            email,
            password: await bcrypt.hash(password, 10)
        }

        memoryUsersByEmail.set(email, user)
        memoryUsersByUsername.set(username, user)

        setTokenCookie(res, signUserToken(user))

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [ { username }, { email } ]
    })

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "Account already exists with this email address or username"
        })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
        username,
        email,
        password: hash
    })

    const token = signUserToken(user)

    setTokenCookie(res, token)


    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}


/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {

    const { email, password } = req.body

    if (!isDatabaseConnected()) {
        const user = memoryUsersByEmail.get(email)

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        setTokenCookie(res, signUserToken(user))
        return res.status(200).json({
            message: "User loggedIn successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    }

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const token = signUserToken(user)

    setTokenCookie(res, token)
    res.status(200).json({
        message: "User loggedIn successfully.",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}


/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token

    if (token && isDatabaseConnected()) {
        await tokenBlacklistModel.create({ token })
    }

    res.clearCookie("token", getTokenCookieOptions())

    res.status(200).json({
        message: "User logged out successfully"
    })
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {

    if (!isDatabaseConnected()) {
        return res.status(200).json({
            message: "User details fetched successfully",
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email
            }
        })
    }

    const user = await userModel.findById(req.user.id)


    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}



module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}
