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
// 2. LÓGICA DE HORARIOS Y FILTROS POR FECHA
// ==========================================
const fechaInput = document.getElementById('fecha');
const servicioSelect = document.getElementById('servicio');
const horarioSelect = document.getElementById('horario');

// Bloquear días pasados en el almanaque
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

    // Alerta inmediata si eligen Sábado o Domingo al hacer clic en el input
    const fechaEvaluada = new Date(fechaInput.value + 'T00:00:00');
    if (fechaEvaluada.getDay() === 0 || fechaEvaluada.getDay() === 6) {
        alert("El consultorio médico atiende exclusivamente de Lunes a Viernes.");
        fechaInput.value = "";
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Seleccione fecha y servicio</option>';
        return;
    }

    const opcionSeleccionada = servicioSelect.options[servicioSelect.selectedIndex];
    const duracionServicioNuevo = parseInt(opcionSeleccionada.getAttribute('data-duracion'));
    horarioSelect.innerHTML = '<option value="">Seleccione un horario...</option>';
    
    // Jornada laboral de corrido (10:00 a 15:00 hs)
    let horaInicioJornada = 600; 
    const horaFinJornada = 900;  

    const turnosOcupados = []; // Simulación vacía para la demo

    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaHoyString = `${anio}-${mes}-${dia}`; 
    const minutosActuales = (ahora.getHours() * 60) + ahora.getMinutes();
    
    let hayHorariosTotales = false;

    while (horaInicioJornada + duracionServicioNuevo <= horaFinJornada) {
        let estaOcupado = false;

        // Filtros especiales si seleccionan el día de HOY
        if (fechaInput.value === fechaHoyString) {
            if (horaInicioJornada <= minutosActuales) estaOcupado = true; // Horas pasadas
            if (horaInicioJornada > (horaFinJornada - 60)) estaOcupado = true; // Menos de 1 hora para el cierre
        }

        let hrs = Math.floor(horaInicioJornada / 60);
        let mins = horaInicioJornada % 60;
        let tiempoFormateado = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        
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

    if (hayHorariosTotales) {
        horarioSelect.disabled = false;
    } else {
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Sin turnos disponibles para hoy</option>';
    }
}

// ==========================================
// 3. RESTRICCIONES DE CARACTERES EN VIVO
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
    this.value = this.value.replace(/\s/g, '').toLowerCase();
});

// ==========================================
// 4. CONTROL DE ENVÍO BLINDADO (LA CLAVE)
// ==========================================
document.getElementById('turnoForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Detenemos cualquier acción por defecto obligatoriamente
    
    // VALIDACIÓN 1: Verificar campos vacíos obligatorios
    if (!nombreInput.value || !telefonoInput.value || !emailInput.value || !servicioSelect.value || !fechaInput.value || !horarioSelect.value) {
        alert("Por favor, completa todos los campos obligatorios (*).");
        return;
    }

    // VALIDACIÓN 2: Bloqueo estricto de extensiones (.com, .com.ar, .ar) ¡Adiós al .om!
    const regexEmailEstricto = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com\.ar|com|ar)$/;
    if (!regexEmailEstricto.test(emailInput.value)) {
        alert("Error: El correo electrónico no es válido. Debe terminar estrictamente en .com, .com.ar o .ar");
        emailInput.focus();
        return; // Frena el código acá. No manda nada a Make ni cambia el botón.
    }

    // VALIDACIÓN 3: Bloqueo de fin de semana al enviar
    const fechaSeleccionada = new Date(fechaInput.value + 'T00:00:00');
    if (fechaSeleccionada.getDay() === 0 || fechaSeleccionada.getDay() === 6) {
        alert("Error: No se atienden turnos los fines de semana (Sábados o Domingos).");
        fechaInput.focus();
        return; // Frena el código
    }

    // =========================================================
    // SI PASÓ LOS CANDADOS, RECIÉN AQUÍ SE EJECUTA EL WEBHOOK
    // =========================================================
    const btnConfirmar = document.getElementById('btnConfirmar');
    const btnTexto = document.getElementById('btnTexto');
    const opcionSeleccionada = servicioSelect.options[servicioSelect.selectedIndex];
    
    btnConfirmar.disabled = true;
    btnConfirmar.style.backgroundColor = "#94a3b8";
    btnConfirmar.style.cursor = "not-allowed";
    btnTexto.innerText = "Procesando reserva... Por favor espere";

    const datosTurno = {
        nombre: nombreInput.value,
        telefono: telefonoInput.value,
        email: emailInput.value,
        servicio: servicioSelect.options[servicioSelect.selectedIndex].text, 
        duracion: parseInt(opcionSeleccionada.getAttribute('data-duracion')), 
        obraSocial: osSelect.value.toUpperCase(),
        plan: planSelect.options[planSelect.selectedIndex].text,
        fecha: fechaInput.value,
        horario: horarioSelect.value,
        comentarios: document.getElementById('comentarios').value
    };

    const urlWebhookMake = "https://hook.eu1.make.com/hp1k5ih8o8u86v9ri9yfypknuwjacajr";

    fetch(urlWebhookMake, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosTurno)
    })
    .then(response => {
        if (response.ok) {
            alert(`¡Turno reservado con éxito!\nSe envió un correo a ${datosTurno.email}.`);
            document.getElementById('turnoForm').reset(); 
            horarioSelect.disabled = true;
            planSelect.disabled = true;
        } else {
            alert("Hubo un problema en el servidor de Make. Intenta nuevamente.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error de red. Verifica tu conexión.");
    })
    .finally(() => {
        btnConfirmar.disabled = false;
        btnConfirmar.style.backgroundColor = ""; 
        btnConfirmar.style.cursor = "pointer";
        btnTexto.innerText = "Confirmar Reserva";
    });
});