const express = require('express')
const router = express.Router()
const User = require('../abstractypes/user')

// POST /users/create
router.post('/create', async (req, res) => {
  const { email, password } = req.body

  const user = new User()
  await user.create({ email, password })

  /* CHECK IF USER EXISTS */
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const userId = User.getIdByToken(token)

    // if (await User.isGhost(userId)) si lo es, migrarlo
  }

  return res.status(201).json({
    success: true,
    token: user.getToken()
  })
})

// POST /users/live
router.get('/live', async (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ success: false, message: 'Token Bearer requerido en el header Authorization' })
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

  const ip = req.ip || '0.0.0.0'
  await user.registerActivity(ip)

  return res.json({ success: true })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) return res.status(400).json({ success: false, message: 'Necesito correo y contraseña' })

  const user = new User()
  const userLoginId = await user.loginUser(email, password)

  if (userLoginId) user.findById(userLoginId)
  else return res.status(404).json({ success: false, message: 'Credenciales invalidas' })

  /* CHECK IF USER EXISTS */
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const userId = User.getIdByToken(token)

    if (userId && await User.isGhost(userId)) user.migrateFrom(userId)
  }

  return res.status(201).json({
    success: true,
    token: user.getToken()
  })
})

router.post('/register', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Faltan campos' })
  }

  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const userId = User.getIdByToken(token)

    if (userId && await User.isGhost(userId)) {
      // Es un usuario ghost, lo actualizamos
      const user = new User()
      await user.findById(userId)
      await user.update({ email, password })

      return res.status(200).json({
        success: true,
        token: user.getToken()
      })
    }
  }

  // Si no hay token o no es ghost, crear uno nuevo
  const user = new User()
  await user.create({ email, password })

  return res.status(201).json({
    success: true,
    token: user.getToken()
  })
})



module.exports = router
