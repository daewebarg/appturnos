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

// Bloquear días pasados en el calendario nativo
const hoy = new Date().toISOString().split('T')[0];
fechaInput.min = hoy;

// ESCUCHAR CUANDO CAMBIA LA FECHA (Bloqueo inmediato de fin de semana)
fechaInput.addEventListener('change', function() {
    if (!this.value) return;

    // Crear la fecha de forma segura evitando desfases horarios
    const partesFecha = this.value.split('-');
    const fechaEvaluada = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
    const diaSemana = fechaEvaluada.getDay(); // 0 = Domingo, 6 = Sábado

    if (diaSemana === 0 || diaSemana === 6) {
        alert("El consultorio médico atiende exclusivamente de Lunes a Viernes. Por favor, seleccione un día laboral.");
        this.value = ""; // Borra el sábado/domingo mal elegido
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Seleccione fecha y servicio</option>';
        return;
    }
    
    // Si es un día válido, genera los horarios
    generarHorariosDisponibles();
});

servicioSelect.addEventListener('change', generarHorariosDisponibles);

function generarHorariosDisponibles() {
    // Si falta la fecha o el servicio, mantenemos el selector de horarios apagado
    if (!fechaInput.value || !servicioSelect.value) {
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Seleccione fecha y servicio</option>';
        return;
    }

    // 1. CAPTURAR LA FECHA CORRECTAMENTE (Evitando desfases de zona horaria)
    const partesFecha = fechaInput.value.split('-');
    // El mes en JavaScript va de 0 (enero) a 11 (diciembre), por eso restamos 1
    const fechaEvaluada = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
    const diaSemana = fechaEvaluada.getDay(); // 0 = Domingo, 6 = Sábado

    // 2. FILTRO INMEDIATO DE FIN DE SEMANA
    if (diaSemana === 0 || diaSemana === 6) {
        alert("El consultorio médico atiende exclusivamente de Lunes a Viernes. Por favor, seleccione un día laboral.");
        fechaInput.value = ""; // Limpiamos el campo mal elegido
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Seleccione fecha y servicio</option>';
        return;
    }

    // 3. CAPTURAR DURACIÓN DEL SERVICIO (CORREGIDO)
    const opcionSeleccionada = servicioSelect.options[servicioSelect.selectedIndex];
    const duracionServicioNuevo = parseInt(opcionSeleccionada.getAttribute('data-duracion'));
    
    // Limpiamos el selector de horarios para meter las opciones nuevas
    horarioSelect.innerHTML = '<option value="">Seleccione un horario...</option>';
    
    // Jornada laboral de corrido (10:00 a 15:00 hs -> expresada en minutos)
    let horaInicioJornada = 600; 
    const horaFinJornada = 900;  

    const turnosOcupados = []; // Simulación limpia para la demo

    // Capturar hora y fecha del día de hoy real del sistema
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaHoyString = `${anio}-${mes}-${dia}`; 
    const minutosActuales = (ahora.getHours() * 60) + ahora.getMinutes();
    
    let hayHorariosTotales = false;

    // 4. GENERAR EL BUCLE DE HORARIOS
    while (horaInicioJornada + duracionServicioNuevo <= horaFinJornada) {
        let estaOcupado = false;

        // Reglas estrictas si eligen sacar un turno para el mismo día de HOY
        if (fechaInput.value === fechaHoyString) {
            if (horaInicioJornada <= minutosActuales) estaOcupado = true; // El horario ya pasó en el reloj
            if (horaInicioJornada > (horaFinJornada - 60)) estaOcupado = true; // Falta menos de 1 hora para el cierre
        }

        let hrs = Math.floor(horaInicioJornada / 60);
        let mins = horaInicioJornada % 60;
        let tiempoFormateado = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = tiempoFormateado;

        if (estaOcupado) {
            option.textContent = `${tiempoFormateado} hs (No disponible)`;
            option.disabled = true;
            option.style.color = "rgba(255,255,255,0.4)"; 
        } else {
            option.textContent = `${tiempoFormateado} hs`;
            hayHorariosTotales = true;
        }

        horarioSelect.appendChild(option);
        horaInicioJornada += duracionServicioNuevo; 
    }

    // 5. HABILITAR EL SELECTOR SI HAY OPCIONES VÁLIDAS
    if (hayHorariosTotales) {
        horarioSelect.disabled = false;
    } else {
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Sin turnos disponibles para hoy</option>';
    }
}

// ==========================================
// 3. RESTRICCIONES DE TEXTO EN VIVO
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
// 4. ENVÍO EN WEBHOOK CON CANDADOS ULTRA ESTRICTOS
// ==========================================
document.getElementById('turnoForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Frenamos el envío nativo para inspeccionar los datos primero

    // Candado 1: Verificar que no falte ningún dato obligatorio
    if (!nombreInput.value || !telefonoInput.value || !emailInput.value || !servicioSelect.value || !fechaInput.value || !horarioSelect.value) {
        alert("Por favor, completa todos los campos obligatorios antes de continuar.");
        return;
    }

    // Candado 2: Filtro absoluto para extensiones de correo. ¡Adiós al .om!
    const regexEmailEstricto = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com\.ar|com|ar)$/;
    if (!regexEmailEstricto.test(emailInput.value)) {
        alert("Error: Correo inválido. Debe terminar estrictamente en .com, .com.ar o .ar");
        emailInput.focus();
        return; // Frena el código por completo aquí.
    }

    // Candado 3: Doble verificación de seguridad para fines de semana
    const partesFecha = fechaInput.value.split('-');
    const fechaSeleccionada = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
    if (fechaSeleccionada.getDay() === 0 || fechaSeleccionada.getDay() === 6) {
        alert("Error: No se pueden agendar turnos en días de fin de semana.");
        fechaInput.value = "";
        return; // Frena el código por completo aquí.
    }

    // =========================================================
    // SI PASÓ LOS CANDADOS, RECIÉN AQUÍ ACTIVA EL BOTÓN Y ENVÍA
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
            alert("Hubo un problema al procesar el turno en el servidor. Intenta de nuevo.");
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