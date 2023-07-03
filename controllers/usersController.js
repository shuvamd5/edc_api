const User = require('../models/User')
const bcrypt = require('bcrypt')

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = async (req, res) => {
    // Get all users from MongoDB
    const users = await User.find().select('-password').lean()

    // If no users 
    if (!users?.length) {
        return res.status(400).json({ message: 'No users found' })
    }

    res.json(users)
}

// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = async (req, res) => {

    const { firstname, middlename, lastname, password, address, email, contact, qualification, roles } = req.body
    const username = (middlename.length && lastname.length) 
        ? firstname+" "+middlename+" "+lastname 
        : (middlename.length) 
            ? firstname+" "+middlename
            : (lastname.length)
                ? firstname+" "+lastname
                : firstname
    // Confirm data
    if (!firstname || !password || !address || !email || !contact) {
        return res.status(400).json({ message: 'All fields are required' })
    }

    // Check for duplicate username
    const duplicateemail = await User.findOne({ email }).collation({ locale: 'en', strength: 2 }).lean().exec()

    const duplicatecontact = await User.findOne({ contact }).collation({ locale: 'en', strength: 2 }).lean().exec()

    if (duplicateemail && duplicatecontact) {
        return res.status(409).json({ message: 'Duplicate email and contact' })
    } else if (duplicateemail){
        return res.status(409).json({ message: 'Duplicate email' })
    } else if (duplicatecontact) {
        return res.status(409).json({ message: 'Duplicate contact' })
    }

    // Hash password 
    const hashedPwd = await bcrypt.hash(password, 10) // salt rounds

    const userObject = (!Array.isArray(qualification) || !qualification.length || !Array.isArray(roles) || !roles.length) 
        ? { username, "password": hashedPwd, address, email, contact } 
        : { username, "password": hashedPwd, address, email, contact, qualification, roles }

    // Create and store new user 
    const user = await User.create(userObject)

    if (user) { //created 
        res.status(201).json({ message: `New user ${username} created` })
    } else {
        res.status(400).json({ message: 'Invalid user data received' })
    }
}

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = async (req, res) => {
    const { id, username, password, address, email, contact, qualification, active, roles } = req.body

    // Confirm data 
    if (!id || !username || !address || !email || !contact || !Array.isArray(qualification) || !qualification.length || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean' ) {
        return res.status(400).json({ message: 'All fields except password are required' })
    }

    // Does the user exist to update?
    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'User not found' })
    }

    // Check for duplicate 
    const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()

    // Allow updates to the original user 
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Duplicate username' })
    }

    user.username = username
    user.address = address
    user.email = email
    user.contact = contact
    user.qualification = qualification
    user.roles = roles
    user.active = active

    if (password) {
        // Hash password 
        user.password = await bcrypt.hash(password, 10) // salt rounds 
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} updated` })
}

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = async (req, res) => {
    const { id } = req.body

    // Confirm data
    if (!id) {
        return res.status(400).json({ message: 'User ID Required' })
    }

    // Does the user exist to delete?
    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'User not found' })
    }

    const result = await user.deleteOne()

    const reply = `Username ${result.username} with ID ${result._id} deleted`

    res.json(reply)
}

module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}