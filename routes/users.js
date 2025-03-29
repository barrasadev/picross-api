const express = require('express')
const router = express.Router()
const User = require('../abstractypes/user')

// POST /users/create
router.post('/create', async (req, res) => {
  const { username, email, password } = req.body

  const user = new User()
  await user.create({ username, email, password })

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


module.exports = router
