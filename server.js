const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = process.env.PORT || 3000

// =======================
// 🔥 MONGO
// =======================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Mongo conectado"))
  .catch(err => console.log("❌ Error Mongo:", err))

// =======================
// 📦 TICKETS
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
  fecha: Date,
  garantiaFecha: Date,
  garantiaFoto: String
})

const Ticket = mongoose.model('Ticket', TicketSchema)

// =======================
// 📦 COTIZACIONES
// =======================
const CotizacionSchema = new mongoose.Schema({
  numero: String, // 🔥 NUEVO
  nombre: String,
  celular: String,
  producto: String,
  proveedor: String,
  costoProveedor: String,
  precioCliente: String,
  ganancia: Number,
  descripcion: String,
  foto: String,
  confirmada: String,
  garantiaFecha: Date,
  garantiaFoto: String,
  fecha: Date
})

const Cotizacion = mongoose.model('Cotizacion', CotizacionSchema)

// =======================
// 📦 PROVEEDORES
// =======================
const ProveedorSchema = new mongoose.Schema({
  nombre: String
})

const Proveedor = mongoose.model('Proveedor', ProveedorSchema)

// =======================
app.use(express.json({ limit: '10mb' }))
app.use(express.static('public'))

io.on('connection', () => console.log('Cliente conectado'))

// =======================
// 🧾 TICKETS
// =======================
app.post('/ticket', async (req, res) => {

  const { nombre, telefono, problema } = req.body

  if (!nombre || !telefono || !problema) {
    return res.json({ error: 'Faltan datos' })
  }

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
})

app.get('/tickets', async (req, res) => {
  const data = await Ticket.find()
  res.json(data)
})

app.put('/ticket/:numero', async (req, res) => {
  await Ticket.findOneAndUpdate({ numero: req.params.numero }, req.body)
  io.emit('actualizar')
  res.json({ ok: true })
})

app.delete('/ticket/:numero', async (req, res) => {
  await Ticket.findOneAndDelete({ numero: req.params.numero })
  io.emit('actualizar')
  res.json({ ok: true })
})

// =======================
// 📊 COTIZACIONES
// =======================

// 🆕 CREAR
app.post('/cotizacion', async (req, res) => {

  const {
    nombre, celular, producto, proveedor,
    costoProveedor, precioCliente,
    descripcion, foto,
    garantiaFecha, garantiaFoto
  } = req.body

  // 🔥 GENERAR NÚMERO
  const contador = await Cotizacion.countDocuments()
  const año = new Date().getFullYear()
  const numero = "COT-" + año + "-" + (contador + 1).toString().padStart(4, '0')

  const costo = parseFloat(costoProveedor) || 0
  const precio = parseFloat(precioCliente) || 0

  const nueva = new Cotizacion({
    numero, // 👈 NUEVO
    nombre,
    celular,
    producto,
    proveedor,
    costoProveedor,
    precioCliente,
    ganancia: precio - costo,
    confirmada: 'no',
    descripcion,
    foto,
    garantiaFecha,
    garantiaFoto,
    fecha: new Date()
  })

  await nueva.save()
  res.json({ ok: true })
})

// 📥 LISTAR
app.get('/cotizaciones', async (req, res) => {
  const data = await Cotizacion.find()
  res.json(data)
})

// ✏️ EDITAR + CONFIRMAR
app.put('/cotizacion/:id', async (req, res) => {
  try {

    const cot = await Cotizacion.findById(req.params.id)
    if (!cot) return res.json({ error: 'No existe' })

    const { costoProveedor, precioCliente, confirmada } = req.body

    const costo = parseFloat(costoProveedor || cot.costoProveedor) || 0
    const precio = parseFloat(precioCliente || cot.precioCliente) || 0
    const ganancia = precio - costo

    // 🔥 CONFIRMAR SOLO UNA VEZ
    if (confirmada === 'si' && cot.confirmada !== 'si') {

      const contador = await Ticket.countDocuments()
      const año = new Date().getFullYear()

      const numeroTicket = "T-" + año + "-" + (contador + 1).toString().padStart(4, '0')

      const nuevoTicket = new Ticket({
        numero: numeroTicket,
        nombre: cot.nombre,
        telefono: cot.celular,
        problema: 'Venta: ' + cot.producto,
        estado: 'listo',
        precio: precio,
        ganancia: ganancia,
        detalle: 'Generado desde cotización',
        entregado: 'si',
        fecha: new Date(),
        garantiaFecha: cot.garantiaFecha,
        garantiaFoto: cot.garantiaFoto
      })

      await nuevoTicket.save()
      io.emit('actualizar')
    }

    req.body.ganancia = ganancia

    await Cotizacion.findByIdAndUpdate(req.params.id, req.body)

    res.json({ ok: true })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Error al actualizar' })
  }
})

// ❌ BORRAR
app.delete('/cotizacion/:id', async (req, res) => {
  try {

    const cot = await Cotizacion.findById(req.params.id)

    if (!cot) {
      return res.status(404).json({ error: 'No existe' })
    }

    if (cot.confirmada === 'si') {
      await Ticket.findOneAndDelete({
        nombre: cot.nombre,
        telefono: cot.celular,
        problema: 'Venta: ' + cot.producto
      })
    }

    await Cotizacion.findByIdAndDelete(req.params.id)

    io.emit('actualizar')

    res.json({ ok: true })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Error al borrar' })
  }
})

// =======================
// 🏭 PROVEEDORES
// =======================
app.get('/proveedores', async (req, res) => {
  res.json(await Proveedor.find())
})

app.post('/proveedores', async (req, res) => {
  const { nombre } = req.body
  if (!nombre) return res.json({ error: 'Falta nombre' })

  const existe = await Proveedor.findOne({ nombre })
  if (existe) return res.json({ error: 'Ya existe' })

  await new Proveedor({ nombre }).save()
  res.json({ ok: true })
})

// =======================
server.listen(PORT, () => {
  console.log('Servidor en puerto ' + PORT)
})