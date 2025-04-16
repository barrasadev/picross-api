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
      isAdmin: user.isAdmin || false,
      userAgent: user.access && user.access.length > 0 ? user.access[0].userAgent || null : null,
      referrer: user.referrer || 'organic'
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
          userAgent: access.userAgent || 'Unknown',
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

router.get('/dashboardMap', requireAdmin, async (req, res) => {
  try {
    const UserModel = new User().model
    const IPModel = new IP().model

    // Get all users with their first access IP
    const users = await UserModel.find({ 'access.0.ip': { $exists: true } })

    // Create a map to store country counts
    const countryMap = new Map()

    // Process each user
    for (const user of users) {
      if (user.access && user.access.length > 0) {
        const firstAccess = user.access[0]
        if (firstAccess.ip) {
          const ipInfo = await IPModel.findOne({ ip: firstAccess.ip })
          if (ipInfo && ipInfo.country) {
            const country = ipInfo.country
            const currentCount = countryMap.get(country) || 0
            countryMap.set(country, currentCount + 1)
          }
        }
      }
    }

    // Convert map to the required format
    const result = {}
    for (const [country, count] of countryMap) {
      result[country] = {
        users: count,
        name: country
      }
    }

    res.json({
      success: true,
      data: result
    })
  } catch (err) {
    console.error('Error in dashboardMap:', err)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

router.get('/dashboardUsersVisits', requireAdmin, async (req, res) => {
  try {
    const UserModel = new User().model
    const IPModel = new IP().model

    // Get all users with their access information
    const users = await UserModel.find({ 'access': { $exists: true, $ne: [] } })

    const results = []

    // Process each user
    for (const user of users) {
      if (user.access && user.access.length > 0) {
        const firstAccess = user.access[0]
        let country = null
        let device = 'Unknown'

        // Get country from first access IP
        if (firstAccess.ip) {
          const ipInfo = await IPModel.findOne({ ip: firstAccess.ip })
          if (ipInfo) {
            country = ipInfo.country
          }
        }

        // Get device from user agent
        if (firstAccess.userAgent) {
          device = firstAccess.userAgent
        }

        results.push({
          username: user.username,
          totalVisits: user.access.length,
          country: country,
          profilePicture: user.image,
          device: device,
          isAdmin: user.isAdmin
        })
      }
    }

    // Sort by totalVisits in descending order and get top 20
    const sortedResults = results
      .sort((a, b) => b.totalVisits - a.totalVisits)
      .slice(0, 20)

    res.json({
      success: true,
      data: sortedResults
    })
  } catch (err) {
    console.error('Error in dashboardUsersVisits:', err)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

router.post('/editUser', requireAdmin, async (req, res) => {
  try {
    const { id } = req.query
    const updates = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren campos para actualizar'
      })
    }

    const user = new User()
    await user.findById(id)

    if (!user.get('_id')) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (user.get('isAdmin')) {
      return res.status(403).json({
        success: false,
        message: 'Los administradores son intocables'
      })
    }

    // Actualizar los campos permitidos
    const allowedFields = ['username', 'email', 'password', 'referrer']
    const updateData = {}

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field]
      }
    }

    // Actualizar el usuario
    await user.update(updateData)

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente'
    })
  } catch (err) {
    console.error('Error in editUser:', err)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

module.exports = router
