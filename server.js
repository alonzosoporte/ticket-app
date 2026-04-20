const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = process.env.PORT || 3000

// =======================
// 🔥 CONEXIÓN MONGO
// =======================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Mongo conectado"))
  .catch(err => console.log("❌ Error Mongo:", err))

// =======================
// 📦 MODELO TICKETS
// =======================
const TicketSchema = new mongoose.Schema({
  numero: String,
  nombre: String,
  telefono: String,
  problema: String,
  estado: String,
  precio: String,
  ganancia: String,
  detalle: String,
  entregado: String,
  fecha: Date
})

const Ticket = mongoose.model('Ticket', TicketSchema)

// =======================
// 📦 MODELO COTIZACIONES
// =======================
const CotizacionSchema = new mongoose.Schema({
  nombre: String,
  celular: String,
  producto: String,
  proveedor: String,
  costoProveedor: String,
  precioCliente: String,
  ganancia: Number,
  confirmada: { type: String, default: 'no' }, // 🔥 NUEVO
  descripcion: String,
  foto: String,
  fecha: Date
})

const Cotizacion = mongoose.model('Cotizacion', CotizacionSchema)

// =======================
// 📦 MODELO PROVEEDOR
// =======================
const ProveedorSchema = new mongoose.Schema({
  nombre: String
})

const Proveedor = mongoose.model('Proveedor', ProveedorSchema)

// =======================
// 🔧 MIDDLEWARE
// =======================
app.use(express.json({ limit: '10mb' }))
app.use(express.static('public'))

// =======================
// 🔌 SOCKET
// =======================
io.on('connection', () => {
  console.log('Cliente conectado')
})

/* =====================================================
   🧾 TICKETS
===================================================== */

// 🆕 CREAR
app.post('/ticket', async (req, res) => {
  const { nombre, telefono, problema } = req.body

  if (!nombre || !telefono || !problema) {
    return res.json({ error: 'Faltan datos' })
  }

  try {
    const año = new Date().getFullYear()
    const contador = await Ticket.countDocuments()

    const numero = "T-" + año + "-" + (contador + 1).toString().padStart(4, '0')

    const nuevo = new Ticket({
      numero,
      nombre,
      telefono,
      problema,
      estado: 'pendiente',
      precio: '',
      ganancia: '',
      detalle: '',
      entregado: 'no',
      fecha: new Date()
    })

    await nuevo.save()

    io.emit('actualizar')
    res.json({ ok: true, numero })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Error al crear ticket' })
  }
})

// 📥 LISTAR
app.get('/tickets', async (req, res) => {
  const data = await Ticket.find()
  res.json(data)
})

// ✏️ ACTUALIZAR
app.put('/ticket/:numero', async (req, res) => {
  await Ticket.findOneAndUpdate({ numero: req.params.numero }, req.body)
  io.emit('actualizar')
  res.json({ ok: true })
})

// ❌ BORRAR
app.delete('/ticket/:numero', async (req, res) => {
  await Ticket.findOneAndDelete({ numero: req.params.numero })
  io.emit('actualizar')
  res.json({ ok: true })
})

/* =====================================================
   📊 COTIZACIONES
===================================================== */

// 🆕 CREAR
app.post('/cotizacion', async (req, res) => {
  try {
    const { nombre, celular, producto, proveedor, costoProveedor, precioCliente, descripcion, foto } = req.body

    const costo = parseFloat(costoProveedor) || 0
    const precio = parseFloat(precioCliente) || 0
    const ganancia = precio - costo

    const nueva = new Cotizacion({
      nombre,
      celular,
      producto,
      proveedor,
      costoProveedor,
      precioCliente,
      ganancia,
      confirmada: 'no',
      descripcion,
      foto,
      fecha: new Date()
    })

    await nueva.save()

    res.json({ ok: true })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Error al guardar' })
  }
})

// 📥 LISTAR
app.get('/cotizaciones', async (req, res) => {
  const data = await Cotizacion.find()
  res.json(data)
})

// ✏️ EDITAR
app.put('/cotizacion/:id', async (req, res) => {
  try {

    const actual = await Cotizacion.findById(req.params.id)

    // 🔥 BLOQUEAR SI YA CONFIRMADA
    if (actual.confirmada === 'si') {
      return res.status(400).json({ error: 'No se puede editar, ya confirmada' })
    }

    const costo = parseFloat(req.body.costoProveedor) || 0
    const precio = parseFloat(req.body.precioCliente) || 0

    req.body.ganancia = precio - costo

    await Cotizacion.findByIdAndUpdate(req.params.id, req.body)

    res.json({ ok: true })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Error al actualizar' })
  }
})

// ❌ BORRAR
app.delete('/cotizacion/:id', async (req, res) => {
  await Cotizacion.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

/* =====================================================
   🔥 CONFIRMAR VENTA (PRO)
===================================================== */

app.put('/cotizacion/confirmar/:id', async (req, res) => {

  const c = await Cotizacion.findById(req.params.id)

  if (!c) return res.sendStatus(404)

  // 🚫 evitar doble confirmación
  if (c.confirmada === 'si') {
    return res.status(400).json({ msg: 'Ya confirmada' })
  }

  const costo = parseFloat(c.costoProveedor) || 0
  const precio = parseFloat(c.precioCliente) || 0
  const ganancia = precio - costo

  c.confirmada = 'si'
  c.ganancia = ganancia

  await c.save()

  // 🔥 SE SUMA A TICKETS
  await Ticket.create({
    numero: 'VENTA-' + Date.now(),
    nombre: c.nombre,
    telefono: c.celular,
    problema: 'Venta: ' + c.producto,
    precio: c.precioCliente,
    ganancia: ganancia,
    estado: 'listo',
    entregado: 'si',
    fecha: new Date()
  })

  io.emit('actualizar')

  res.json({ ok: true })
})

/* =====================================================
   🏭 PROVEEDORES
===================================================== */

app.get('/proveedores', async (req, res) => {
  const data = await Proveedor.find().sort({ nombre: 1 })
  res.json(data)
})

app.post('/proveedores', async (req, res) => {
  const { nombre } = req.body

  if (!nombre) return res.json({ error: 'Falta nombre' })

  const existe = await Proveedor.findOne({ nombre })
  if (existe) return res.json({ error: 'Ya existe' })

  const nuevo = new Proveedor({ nombre })
  await nuevo.save()

  res.json({ ok: true })
})

app.delete('/proveedores/:id', async (req, res) => {
  await Proveedor.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

/* =====================================================
   🔎 CLIENTES
===================================================== */

app.get('/clientes', async (req, res) => {
  const q = req.query.q || ''

  const data = await Cotizacion.find({
    $or: [
      { nombre: { $regex: q, $options: 'i' } },
      { celular: { $regex: q, $options: 'i' } }
    ]
  }).limit(10)

  res.json(data)
})

// =======================
// 🚀 SERVER
// =======================
server.listen(PORT, () => {
  console.log('Servidor en puerto ' + PORT)
})