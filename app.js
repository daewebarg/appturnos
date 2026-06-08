// Variable para guardar los turnos confirmados en esta sesión de la demo
let turnosConfirmadosEnSesion = [];
// Variable que guardará los turnos ocupados reales venidos de Calendar
let turnosOcupadosEnCalendar = [];

// ==========================================
// 1. MAPEO DE OBRAS SOCIALES Y PLANES
// ==========================================
const planesPorOS = {
    osde: ["OSDE 210", "OSDE 310", "OSDE 410", "OSDE 510"],
    swiss: ["SMG20", "SMG30", "SMG50"],
    particular: ["Sin Plan (Particular)"]
};

const osSelect = document.getElementById('obraSocial');
const planSelect = document.getElementById('plan');

// Función para consultar a Make (Webhook de lectura)
async function listCalendar() {
    try {
        // REEMPLAZA ESTA URL POR LA DE TU WEBHOOK DE LECTURA EN MAKE
        const respuesta = await fetch("https://hook.eu1.make.com/hp1k5ih8o8u86v9ri9yfypknuwjacajr");
        turnosOcupadosEnCalendar = await respuesta.json();
        console.log("Turnos sincronizados con Calendar:", turnosOcupadosEnCalendar);
    } catch (error) {
        console.error("Error al sincronizar con Calendar:", error);
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', listCalendar);

osSelect.addEventListener('change', function() {
    const osSeleccionada = this.value;
    planSelect.innerHTML = '<option value="">Seleccione...</option>';
    
    if (osSeleccionada && planesPorOS[osSeleccionada]) {
        planSelect.disabled = false;
        planesPorOS[osSeleccionada].forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.toLowerCase().replace(/ /g, "-");
            option.textContent = plan;
            planSelect.appendChild(option);
        });
    } else {
        planSelect.disabled = true;
        planSelect.innerHTML = '<option value="">Seleccione Obra Social</option>';
    }
});

// ==========================================
// 2. LÓGICA DE HORARIOS Y BLOQUEOS (ALGORITMO)
// ==========================================
const fechaInput = document.getElementById('fecha');
const servicioSelect = document.getElementById('servicio');
const horarioSelect = document.getElementById('horario');

const hoy = new Date().toISOString().split('T')[0];
fechaInput.min = hoy;

fechaInput.addEventListener('change', generarHorariosDisponibles);
servicioSelect.addEventListener('change', generarHorariosDisponibles);

function generarHorariosDisponibles() {
    if (!fechaInput.value || !servicioSelect.value) {
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Seleccione fecha y servicio</option>';
        return;
    }

    const opcionSeleccionada = servicioSelect.options[servicioSelect.selectedIndex];
    const duracionServicioNuevo = parseInt(opcionSeleccionada.getAttribute('data-duracion'));
    horarioSelect.innerHTML = '<option value="">Seleccione un horario...</option>';
    
    let horaInicioJornada = 600; 
    const horaFinJornada = 900;  

    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaHoyString = `${anio}-${mes}-${dia}`; 
    const minutosActuales = (ahora.getHours() * 60) + ahora.getMinutes();

    let hayHorariosTotales = false;

    while (horaInicioJornada + duracionServicioNuevo <= horaFinJornada) {
        let hrs = Math.floor(horaInicioJornada / 60);
        let mins = horaInicioJornada % 60;
        let tiempoFormateado = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        
        // --- VERIFICACIÓN COMBINADA (Sesión local + Google Calendar real) ---
        let estaOcupado = turnosConfirmadosEnSesion.includes(fechaInput.value + "_" + tiempoFormateado) || 
                          turnosOcupadosEnCalendar.includes(fechaInput.value + "_" + tiempoFormateado);

        // Restricción de tiempo real si es HOY
        if (fechaInput.value === fechaHoyString) {
            if (horaInicioJornada <= minutosActuales || horaInicioJornada > (horaFinJornada - 60)) {
                estaOcupado = true;
            }
        }
        
        const option = document.createElement('option');
        option.value = tiempoFormateado;

        if (estaOcupado) {
            option.textContent = `${tiempoFormateado} hs (No disponible)`;
            option.disabled = true;
            option.style.color = "#94a3b8"; 
        } else {
            option.textContent = `${tiempoFormateado} hs`;
            hayHorariosTotales = true; 
        }

        horarioSelect.appendChild(option);
        horaInicioJornada += duracionServicioNuevo; 
    }

    horarioSelect.disabled = !hayHorariosTotales;
    if (!hayHorariosTotales) horarioSelect.innerHTML = '<option value="">Sin turnos disponibles</option>';
}

// ==========================================
// 3. RESTRICCIONES DE ESCRITURA
// ==========================================
const nombreInput = document.getElementById('nombre');
const telefonoInput = document.getElementById('telefono');
const emailInput = document.getElementById('email');

nombreInput.addEventListener('input', function() {
    this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
});

telefonoInput.addEventListener('input', function() {
    let valor = this.value;
    this.value = valor.startsWith('+') ? '+' + valor.slice(1).replace(/[^0-9]/g, '') : valor.replace(/[^0-9]/g, '');
});

emailInput.addEventListener('input', function() {
    this.value = this.value.replace(/\s/g, '');
});

// ==========================================
// 4. ENVÍO DEL FORMULARIO
// ==========================================
document.getElementById('turnoForm').addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    const fechaSeleccionada = new Date(fechaInput.value + 'T00:00:00');
    if (fechaSeleccionada.getDay() === 0 || fechaSeleccionada.getDay() === 6) {
        alert("Lo sentimos, no realizamos turnos los fines de semana.");
        return; 
    }

    const correo = emailInput.value.toLowerCase();
    if (!(correo.endsWith('.com') || correo.endsWith('.ar') || correo.endsWith('.com.ar'))) {
        alert("Error: Correo inválido.");
        return; 
    }

    const btnConfirmar = document.getElementById('btnConfirmar');
    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "Procesando...";

    const datosTurno = {
        nombre: nombreInput.value,
        telefono: telefonoInput.value,
        email: emailInput.value,
        servicio: servicioSelect.options[servicioSelect.selectedIndex].text, 
        obraSocial: osSelect.value.toUpperCase(),
        plan: planSelect.options[planSelect.selectedIndex].text,
        fecha: fechaInput.value,
        horario: horarioSelect.value,
        comentarios: document.getElementById('comentarios').value
    };

    fetch("https://hook.eu1.make.com/hp1k5ih8o8u86v9ri9yfypknuwjacajr", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosTurno)
    })
    .then(response => {
        if (response.ok) {
            turnosConfirmadosEnSesion.push(fechaInput.value + "_" + horarioSelect.value);
            alert("¡Turno reservado con éxito!");
            document.getElementById('turnoForm').reset(); 
            horarioSelect.disabled = true;
            planSelect.disabled = true;
        } else {
            alert("Error en el servidor.");
        }
    })
    .catch(() => alert("Error de conexión."))
    .finally(() => {
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = "Confirmar Reserva";
    });
});