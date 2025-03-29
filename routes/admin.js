const express = require('express')
const router = express.Router()
const requireAdmin = require('../middlewares/requireAdmin')

// Ruta protegida solo para admin
router.get('/', requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido al panel admin 👑'
  })
})

module.exports = router