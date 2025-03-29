const User = require('../abstractypes/user')

async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]
  const userId = User.getIdByToken(token)
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Token inválido' })
  }

  const user = new User()
  const userData = await user.findById(userId)

  if (!userData?.isAdmin) return res.status(403).json({ success: false, message: 'Acceso denegado: no eres administrador' })

  next()
}

module.exports = requireAdmin
