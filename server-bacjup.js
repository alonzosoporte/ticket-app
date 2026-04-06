console.log("SERVER PRO FINAL + PDF")

const fs = require('fs')
const express = require('express')
const app = express()
const path = require('path')
const nodemailer = require('nodemailer')
const PDFDocument = require('pdfkit')

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.static(__dirname))

// 📩 EMAIL
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "alonzosoporte@gmail.com",
    pass: "ivlsklujgbnhrczc"
  }
})

// 🏠 HOME
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

// 📥 OBTENER TICKETS
app.get('/tickets', (req, res) => {

  if (!fs.existsSync('tickets.json')) {
    return res.json([])
  }

  const data = fs.readFileSync('tickets.json', 'utf8')
  const tickets = data ? JSON.parse(data) : []

  res.json(tickets)
})

// 📩 CREAR TICKET
app.post('/ticket', async (req, res) => {

  const { nombre, email, telefono, problema } = req.body

  const fecha = new Date().toLocaleString('es-UY')
  const año = new Date().getFullYear()

  try {

    let tickets = []

    if (fs.existsSync('tickets.json')) {
      const data = fs.readFileSync('tickets.json', 'utf8')
      if (data) tickets = JSON.parse(data)
    }

    let contador = 1

    if (tickets.length > 0) {
      const ultimo = tickets[tickets.length - 1]
      const partes = ultimo.numero.split("-")
      contador = parseInt(partes[2]) + 1
    }

    const numero = String(contador).padStart(4, '0')
    const ticket = "T-" + año + "-" + numero

    const nuevo = {
      numero: ticket,
      nombre,
      email,
      telefono,
      problema,
      fecha,
      estado: "pendiente"
    }

    tickets.push(nuevo)

    fs.writeFileSync('tickets.json', JSON.stringify(tickets, null, 2))

    // 📩 MAIL CLIENTE
    await transporter.sendMail({
      from: "alonzosoporte@gmail.com",
      to: email,
      subject: "📩 Ticket recibido - " + ticket,
      html: `
        <div style="font-family:Arial;background:#f4f4f4;padding:20px;">
          <div style="background:white;padding:20px;border-radius:10px;max-width:500px;margin:auto;">
            <h2>✅ Ticket recibido</h2>
            <p>Hola <b>${nombre}</b></p>
            <p>Su solicitud fue procesada correctamente.</p>
            <p><b>Número:</b> ${ticket}</p>
            <p><b>Problema:</b> ${problema}</p>
          </div>
        </div>
      `
    })

    res.send("Ticket creado " + ticket)

  } catch (err) {
    console.log(err)
    res.send("Error")
  }
})

// 🔄 CAMBIAR ESTADO
app.post('/estado', async (req, res) => {

  const { numero, estado, precio, detalle, mensaje } = req.body

  if (!fs.existsSync('tickets.json')) {
    return res.send("No hay tickets")
  }

  let tickets = JSON.parse(fs.readFileSync('tickets.json', 'utf8'))

  const ticket = tickets.find(t => t.numero === numero)

  if (!ticket) return res.send("No encontrado")

  const yaReparado = ticket.estado === "reparado"

  ticket.estado = estado.toLowerCase().trim()

  if (precio) ticket.precio = precio
  if (detalle) ticket.detalle = detalle
  if (mensaje) ticket.mensaje = mensaje

  
  // 🔥 SI REPARADO → PDF + MAIL
  if (ticket.estado === "reparado" || yaReparado) {

    try {

      // 🧾 CREAR PDF
      const filePath = path.join(__dirname, factura-${numero}.pdf)

      const doc = new PDFDocument()
      doc.pipe(fs.createWriteStream(filePath))

      doc.fontSize(20).text("Factura de Servicio", { align: "center" })
      doc.moveDown()

      doc.fontSize(12).text(Cliente: ${ticket.nombre})
      doc.text(Ticket: ${numero})
      doc.text(Fecha: ${new Date().toLocaleDateString()})
      doc.moveDown()

      doc.text(Detalle: ${ticket.detalle || "-"})
      doc.text(Precio: $${ticket.precio || 0})
      doc.moveDown()

      doc.text("Gracias por su confianza", { align: "center" })

      doc.end()

      console.log("PDF creado:", filePath)

      // 📩 MAIL CON PDF
      await transporter.sendMail({
  from: "alonzosoporte@gmail.com",
  to: ticket.email,
  subject: "🔧 Equipo reparado - " + numero,
  text:
    "Equipo reparado\n\n" +
    "Ticket: " + numero + "\n" +
    "Detalle: " + (ticket.detalle || "-") + "\n" +
    "Precio: $" + (ticket.precio || 0)
})
        `,

        // 🔥 ACA VA EL PDF
        attachments: [
          {
            filename: factura-${numero}.pdf,
            path: filePath
          }
        ]
      })

      console.log("MAIL + PDF enviado")

    } catch (err) {
      console.log("ERROR:", err)
    }
  }

  fs.writeFileSync('tickets.json', JSON.stringify(tickets, null, 2))

  res.send("Estado actualizado")
})

// 🚀 SERVER
app.listen(PORT, () => {
  console.log("Servidor en http://localhost:" + PORT)
})