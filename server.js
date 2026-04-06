const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

app.use(express.json())
app.use(express.static(__dirname))

let tickets = []

// 🔌 SOCKET
io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado')
})

// 📥 CREAR TICKET
app.post('/ticket', (req, res) => {

  const { nombre, telefono, problema } = req.body

  const ahora = new Date()

  const año = ahora.getFullYear()
  const mes = (ahora.getMonth() + 1).toString().padStart(2, '0')

  // 🔢 BUSCAR ÚLTIMO DEL MES
  let ultimo = tickets.reduce((max, t) => {

    if (!t.numero) return max

    if (t.numero.startsWith(`Ticket-${año}-${mes}`)) {
      const partes = t.numero.split("-")
      const n = parseInt(partes[3]) || 0
      return n > max ? n : max
    }

    return max

  }, 0)

  const numero = `Ticket-${año}-${mes}-${(ultimo + 1).toString().padStart(3, '0')}`

  const nuevo = {
    numero,
    nombre,
    telefono,
    problema,
    estado: "pendiente",
    precio: "",
    detalle: "",
    fecha: ahora.toLocaleDateString()
  }

  tickets.push(nuevo)

  console.log("📄 Nuevo ticket:", numero)

  io.emit('actualizar')

  res.json({ ok: true, numero })
})

// 📤 OBTENER TICKETS
app.get('/tickets', (req, res) => {
  res.json(tickets)
})

// ✏️ ACTUALIZAR
app.put('/ticket/:numero', (req, res) => {

  const { numero } = req.params
  const { estado, precio, detalle } = req.body

  let t = tickets.find(x => x.numero == numero)

  if (t) {
    t.estado = (estado || "").toLowerCase().trim()
    t.precio = precio
    t.detalle = detalle

    console.log("✏️ Actualizado:", numero, t.estado)

    io.emit('actualizar')
  }

  res.json({ ok: true })
})

// 🗑 BORRAR
app.delete('/ticket/:numero', (req, res) => {

  const { numero } = req.params

  tickets = tickets.filter(t => t.numero != numero)

  console.log("🗑 Eliminado:", numero)

  io.emit('actualizar')

  res.json({ ok: true })
})

// 🚀 SERVIDOR
http.listen(3000, () => {
  console.log('🚀 Servidor en http://localhost:3000')
})