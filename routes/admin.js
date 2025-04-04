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
  const { username, email } = req.query

  const UserModel = new User().model

  // Construir el query de búsqueda
  const searchQuery = {}
  if (username) {
    searchQuery.username = { $regex: username, $options: 'i' }
  }
  if (email) {
    searchQuery.email = { $regex: email, $options: 'i' }
  }

  const allUsers = await UserModel.find(searchQuery).sort({ 'access.end': -1 })

  const paginatedUsers = allUsers.slice((page - 1) * pageSize, page * pageSize)

  const results = []

  for (const userData of paginatedUsers) {
    const { _id, username, image, email, access = [], avgTime = 0, isAdmin = false } = userData

    let isOnline = false
    let country = null
    let countryFlag = null
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
        countryFlag = ipModel.get('countryFlag') || null
      }
    }

    const userResult = {
      id: _id,
      username,
      image,
      isOnline,
      country,
      countryFlag,
      avgTime,
      isRegistered: !!email,
      lastActivity,
      isAdmin
    }

    results.push(userResult)
  }

  return res.json({ success: true, users: results })
})

router.post('/datosUsuario', requireAdmin, async (req, res) => {
  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      })
    }

    const UserModel = new User().model
    const user = await UserModel.findById(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    let isOnline = false
    let country = null
    let countryFlag = null
    let visitsLast7Days = 0

    if (user.access && user.access.length > 0) {
      const lastAccess = user.access[user.access.length - 1]
      const now = new Date()
      const endDate = new Date(lastAccess.end)
      const thirtySecondsAgo = new Date(now.getTime() - 120 * 1000)
      isOnline = thirtySecondsAgo < endDate

      // Get country info from first access
      const firstAccess = user.access[0]
      if (firstAccess && firstAccess.ip) {
        const ipModel = new IP()
        await ipModel.findByIP(firstAccess.ip)
        country = ipModel.get('country') || null
        countryFlag = ipModel.get('countryFlag') || null
      }

      // Calculate visits in last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      visitsLast7Days = user.access.filter(access => new Date(access.end) > sevenDaysAgo).length
    }

    const userData = {
      usuario: user.username,
      correo: user.email,
      imagen: user.image,
      cantidadAccesos: user.access ? user.access.length : 0,
      accesosUltimos7Dias: visitsLast7Days,
      fechaCreacion: user.createdOn,
      avgTime: user.avgTime || 0,
      isOnline,
      paisCreacion: country,
      banderaPais: countryFlag,
      isAdmin: user.isAdmin || false
    }

    res.json({
      success: true,
      data: userData
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

router.post('/loginsUsuario', requireAdmin, async (req, res) => {
  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      })
    }

    const UserModel = new User().model
    const user = await UserModel.findById(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Los administradores son intocables'
      })
    }

    const accesos = []
    const ipData = new Map() // Usamos Map para evitar IPs duplicadas

    if (user.access && user.access.length > 0) {
      for (const access of user.access) {
        // Calcular tiempo de visita en segundos
        const startTime = new Date(access.start)
        const endTime = new Date(access.end)
        const visitTimeSeconds = Math.round((endTime - startTime) / 1000)

        accesos.push({
          ip: access.ip,
          fechaEntrada: access.start,
          fechaSalida: access.end,
          tiempoVisita: visitTimeSeconds
        })

        // Solo procesamos la IP si no la hemos visto antes
        if (access.ip && !ipData.has(access.ip)) {
          const ipModel = new IP()
          await ipModel.findByIP(access.ip)
          ipData.set(access.ip, {
            ip: access.ip,
            country: ipModel.get('country') || null,
            countryFlag: ipModel.get('countryFlag') || null,
            city: ipModel.get('city') || null,
            region: ipModel.get('region') || null
          })
        }
      }
    }

    res.json({
      success: true,
      accesos: accesos,
      datosIPs: Array.from(ipData.values())
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

module.exports = router
