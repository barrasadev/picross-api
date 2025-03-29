const express = require('express')
const router = express.Router()
const requireAdmin = require('../middlewares/requireAdmin')
const User = require('../abstractypes/user')

// Ruta protegida solo para admin
router.get('/', requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido al panel admin 👑'
  })
})

router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countUsers()
    const recentUsers = await User.countUsers(7)
    const avgVisitTime = await User.avgVisitTimeLastMonth(7)

    res.json({
      success: true,
      totalUsers,
      recentUsers,
      avgVisitTime // en segundos
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

module.exports = router