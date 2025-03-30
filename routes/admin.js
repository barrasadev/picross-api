// routes/admin.js
const express = require('express')
const router = express.Router()
const requireAdmin = require('../middlewares/requireAdmin')
const Admin = require('../abstractypes/admin')

// Ruta protegida solo para admin
router.get('/', requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido al panel admin 👑'
  })
})

router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const adminUser = new Admin()
    const totalUsers = await adminUser.countUsers()
    const recentUsers = await adminUser.countUsers(7)
    const avgVisitTime = await adminUser.avgVisitTimeLastMonth()

    res.json({
      success: true,
      totalUsers,
      recentUsers,
      avgVisitTime
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

module.exports = router
