// routes/users.js
const express = require('express')
const router = express.Router()
const User = require('../abstractypes/user')
const { image } = require('../schemas/user')


// POST /users/create
router.post('/create', async (req, res) => {
  const { ref } = req.body
  const user = new User()
  await user.create({ ref })

  return res.status(201).json({
    success: true,
    token: user.getToken()
  })
})


// POST /users/register
router.post('/register', async (req, res) => {
  const { email, password, ref } = req.body
  if (!email || !password) return res.status(400).json({ success: false, message: 'Faltan campos' })

  const UserModel = new User().model
  const existingUser = await UserModel.findOne({ email })
  if (existingUser) return res.status(409).json({ success: false, message: 'emailEnUso' })

  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const userId = User.getIdByToken(token)

    if (userId && await User.isGhost(userId)) {
      const user = new User()
      await user.findById(userId)
      await user.update({ email, password, ref })
      return res.status(200).json({ success: true, token: user.getToken() })
    }
  }

  const user = new User()
  await user.create({ email, password, ref })
  return res.status(201).json({ success: true, token: user.getToken() })
})

// POST /users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ success: false, message: 'Necesito correo y contraseña' })

  const user = new User()
  const userLoginId = await user.loginUser(email, password)
  if (!userLoginId) return res.status(404).json({ success: false, message: 'Credenciales invalidas' })

  await user.findById(userLoginId)

  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const userId = User.getIdByToken(token)
    if (userId && await User.isGhost(userId)) await user.migrateFrom(userId)
  }

  return res.status(201).json({ success: true, token: user.getToken() })
})

// GET /users/live
router.get('/live', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(400).json({ success: false, message: 'Token Bearer requerido' })

  const token = authHeader.split(' ')[1]
  const userId = User.getIdByToken(token)
  if (!userId) return res.status(401).json({ success: false, message: 'Token inválido o expirado' })

  const user = new User()
  await user.findById(userId)
  if (!user.get('_id')) return res.status(404).json({ success: false, message: 'Usuario no encontrado' })

  const ip = req.ip || '0.0.0.0'
  const userAgent = req.headers['user-agent'] || 'Unknown'
  await user.registerActivity(ip, userAgent)

  const access = user.get('access') || []
  const lastSession = access[access.length - 1]

  if (lastSession?.start && lastSession?.end) {
    const duration = new Date(lastSession.end) - new Date(lastSession.start)
    const durationSeconds = Math.round(duration / 1000)
    if (!isNaN(durationSeconds)) {
      const avg = user.get('avgTime')
      const sessionsCount = access.filter(a => a.start && a.end).length

      if (!avg || sessionsCount <= 1) {
        await user.update({ avgTime: durationSeconds })
      } else {
        const newAvg = Math.round(((avg * (sessionsCount - 1)) + durationSeconds) / sessionsCount)
        await user.update({ avgTime: newAvg })
      }
    }
  }

  return res.json({ success: true })
})

// GET /users/accountDetails
router.get('/accountDetails', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(400).json({ success: false, message: 'Token Bearer requerido' })

  const token = authHeader.split(' ')[1]
  const userId = User.getIdByToken(token)
  if (!userId) return res.status(401).json({ success: false, message: 'Token inválido o expirado' })

  const user = new User()
  await user.findById(userId)
  if (!user.get('_id')) return res.status(404).json({ success: false, message: 'Usuario no encontrado' })

  const datos = {
    image: user.get('image'),
    username: user.get('username'),
    email: user.get('email') || 'noemail@playpicross.com'
  }
  return res.json({ success: true, datos })
})

// POST /users/changeDetails
router.post('/changeDetails', async (req, res) => {
  const { profilePicture, name, email } = req.body

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(400).json({ success: false, message: 'Token Bearer requerido' })
  }

  const token = authHeader.split(' ')[1]
  const userId = User.getIdByToken(token)
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' })
  }

  const user = new User()
  await user.findById(userId)
  if (!user.get('_id')) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
  }

  const datos = {}

  if (email) {
    const UserModel = new User().model
    const existingUser = await UserModel.findOne({ email })
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(409).json({ success: false, message: 'emailEnUso' })
    }
    datos.email = email
  }

  if (name) datos.username = name
  if (profilePicture) datos.image = profilePicture

  await user.update(datos)

  return res.json({ success: true })
})

router.post('/changePassword', async (req, res) => {
  const { oldPassword, password } = req.body

  if (!oldPassword || !password) return res.status(400).json({ success: false, message: 'Faltan campos'})

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(400).json({ success: false, message: 'Token Bearer requerido' })
  }

  const token = authHeader.split(' ')[1]
  const userId = User.getIdByToken(token)
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' })
  }

  const user = new User()
  await user.findById(userId)
  if (!user.get('_id')) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
  }

  if (oldPassword === user.get('password')) {
    await user.update({password})
    return res.json({ success: true })
  } else return res.status(404).json({ success: false, message: 'Password incorrect' })
})

// POST /users/score
router.post('/score', async (req, res) => {
  const { token, seed, completionTime, errorsCount, width, height, points } = req.body

  if (!token) return res.status(400).json({ success: false, message: 'Token requerido' })
  if (!seed || !completionTime || errorsCount === undefined || !width || !height || points === undefined) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos' })
  }

  const userId = User.getIdByToken(token)
  if (!userId) return res.status(401).json({ success: false, message: 'Token inválido o expirado' })

  const user = new User()
  await user.findById(userId)
  if (!user.get('_id')) return res.status(404).json({ success: false, message: 'Usuario no encontrado' })

  const puzzles = user.get('puzzles') || []
  puzzles.push({
    seed,
    completionTime,
    errorsCount,
    width,
    height,
    points,
    dateCompleted: new Date()
  })

  await user.update({ puzzles })
  return res.json({ success: true })
})

module.exports = router