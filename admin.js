console.log("ADMIN OK")

const socket = io()

let modo = "pendientes"

// 🎯 BOTÓN ACTIVO
function actualizarBotones() {
  const btnPendientes = document.getElementById("btnPendientes")
  const btnTodos = document.getElementById("btnTodos")

  if (!btnPendientes || !btnTodos) return

  btnPendientes.classList.remove("activo")
  btnTodos.classList.remove("activo")

  if (modo === "pendientes") {
    btnPendientes.classList.add("activo")
  } else {
    btnTodos.classList.add("activo")
  }
}

// 🚀 INICIO
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM listo")

  const btnPendientes = document.getElementById("btnPendientes")
  const btnTodos = document.getElementById("btnTodos")

  if (btnPendientes) {
    btnPendientes.onclick = () => {
      console.log("CLICK pendientes")
      modo = "pendientes"
      actualizarBotones()
      cargar()
    }
  }

  if (btnTodos) {
    btnTodos.onclick = () => {
      console.log("CLICK todos")
      modo = "todos"
      actualizarBotones()
      cargar()
    }
  }

  actualizarBotones()
  cargar()
})

// 🚀 CARGAR
async function cargar() {
  try {

    let res = await fetch('/tickets')
    let tickets = await res.json()

    console.log("DATOS:", tickets)

    const lista = document.getElementById("lista")

    if (!lista) {
      console.error("❌ No existe #lista")
      return
    }

    lista.innerHTML = ""
    tickets.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    tickets.reverse()

    // 🔥 PENDIENTES = TODO LO QUE NO ESTÁ REPARADO
    if (modo === "pendientes") {
      tickets = tickets.filter(t => {
        const estado = (t.estado || "").toLowerCase().trim()
        return !estado.includes("reparado")
      })
    }

    // 🔥 ORDEN (últimos arriba)
    tickets.reverse()

    // 🔥 RENDER
    tickets.forEach(t => {

      const estado = (t.estado || "").toLowerCase()
      let icono = "🟡"

      if (estado.includes("reparado")) {
        icono = "🟢"
      } else if (estado.includes("proceso")) {
        icono = "🔵"
      }
      let clase = "pendiente"

      if (estado.includes("reparado")) {
        clase = "reparado"
      } else if (estado.includes("proceso")) {
        clase = "proceso"
      }

      lista.innerHTML += `
        <div class="ticket ${clase}">
          
          <b>${icono} <b>${t.nombre}</b> (${t.numero})<br>
          📞 ${t.telefono}<br>
          🛠 ${t.problema}<br><br>

          💲 Precio:
          <input type="number" id="precio-${t.numero}" value="${t.precio || ''}"><br>

          🧾 Detalle:
          <input type="text" id="detalle-${t.numero}" value="${t.detalle || ''}"><br>

          📌 Estado:
          <select id="estado-${t.numero}">
            <option ${estado.includes("pendiente")?"selected":""}>pendiente</option>
            <option ${estado.includes("proceso")?"selected":""}>en proceso</option>
            <option ${estado.includes("reparado")?"selected":""}>reparado</option>
          </select>

          <br><br>

          <button onclick="guardar('${t.numero}', '${t.telefono}', '${t.nombre}')">💾 Guardar</button>
          <button onclick="borrar('${t.numero}')">🗑 Borrar</button>
          <button onclick="whatsapp('${t.telefono}', '${t.nombre}', '${t.numero}')">📲 WhatsApp</button>

        </div>
      `
    })

  } catch (error) {
    console.error("ERROR:", error)
  }
}

// 💾 GUARDAR
window.guardar = async function(numero, telefono, nombre) {

  const estado = document.getElementById("estado-" + numero).value
  const precio = document.getElementById("precio-" + numero).value
  const detalle = document.getElementById("detalle-" + numero).value

  await fetch('/ticket/' + numero, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, precio, detalle })
  })

  console.log("Guardado:", estado)

  // 🔥 SI ES REPARADO → WHATSAPP
  if (estado.toLowerCase().includes("reparado")) {

    telefono = telefono.replace(/\D/g, '')

    if (!telefono.startsWith("598")) {
      telefono = "598" + telefono
    }

    const mensaje = `Hola ${nombre},

Su equipo ya está reparado.

Ticket: ${numero}

Precio: ${precio || "A confirmar"}

Detalle: ${detalle || "Sin detalle"}

Favor coordinar para levantar su equipo.`

    const url = "https://wa.me/" + telefono + "?text=" + encodeURIComponent(mensaje)

    window.open(url, "_blank")
  }

  if (estado.toLowerCase().includes("reparado")) {
    modo = "pendientes"
  }

  setTimeout(() => {
    actualizarBotones()
    cargar()
  }, 150)
}

// 🗑 BORRAR
window.borrar = async function(numero) {

  if (!confirm("¿Seguro borrar?")) return

  await fetch('/ticket/' + numero, {
    method: 'DELETE'
  })

  cargar()
}

// 📲 WHATSAPP
window.whatsapp = function(telefono, nombre, numero) {

  telefono = telefono.replace(/\D/g, '')

  if (!telefono.startsWith("598")) {
    telefono = "598" + telefono
  }

  const mensaje = `Hola ${nombre}, su equipo está listo. Ticket: ${numero}`

  window.location.href =
    "https://wa.me/" + telefono + "?text=" + encodeURIComponent(mensaje)
}

// 🔄 TIEMPO REAL
socket.on('actualizar', () => {
  console.log("🔄 Sync servidor")
  setTimeout(() => {
    cargar()
  }, 100)
})