// routes/admin.js
const express = require('express')
const router = express.Router()
const requireAdmin = require('../middlewares/requireAdmin')
const Admin = require('../abstractypes/admin')
const User = require('../abstractypes/user')
const IP = require('../abstractypes/ip')

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

router.get('/listadoUsuarios', requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const pageSize = 10

  console.log(`📄 Página solicitada: ${page}`)

  const UserModel = new User().model
  const allUsers = await UserModel.find().sort({ 'access.end': -1 })

  console.log(`👥 Total de usuarios encontrados: ${allUsers.length}`)

  const paginatedUsers = allUsers.slice((page - 1) * pageSize, page * pageSize)

  const results = []

  for (const userData of paginatedUsers) {
    const { username, image, email, access = [], avgTime = 0 } = userData

    let isOnline = false
    let country = null
    let lastActivity = null

    if (access.length > 0) {
      const last = access[access.length - 1]
      lastActivity = last.end

      const now = new Date()
      const endDate = new Date(last.end)
      const thirtySecondsAgo = new Date(now.getTime() - 120 * 1000)

      isOnline = thirtySecondsAgo < endDate

      const ip = last.ip
      if (ip) {
        const ipModel = new IP()
        await ipModel.findByIP(ip)
        country = ipModel.get('country') || null
      }
    }

    const userResult = {
      username,
      image,
      isOnline,
      country,
      avgTime,
      isRegistered: !!email,
      lastActivity
    }


    results.push(userResult)
  }

  return res.json({ success: true, users: results })
})


module.exports = router
