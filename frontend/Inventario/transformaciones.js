class TransformacionManager {
    constructor() {
        this.productos = [];
        this.productosOrigenValidos = [];
        this.init();
    }

    async init() {
        console.log('🔪 Inicializando Gestor de Transformaciones Inteligente...');
        await this.cargarProductos();
        this.setupEventListeners();
        this.cargarHistorial();
    }

    // 1. CARGA DE DATOS
    async cargarProductos() {
        try {
            const response = await fetch('/api/productos', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (!response.ok) throw new Error('Error cargando productos');
            
            this.productos = await response.json();
            this.llenarSelectOrigen();
        } catch (error) {
            console.error(error);
            this.mostrarNotificacion('Error cargando catálogo', 'error');
        }
    }

    llenarSelectOrigen() {
        const selectOrigen = document.getElementById('origen-producto');
        selectOrigen.innerHTML = '<option value="">Seleccione producto origen...</option>';
        
        // FILTRO: Solo permitir productos que sean "Enteros"
        this.productosOrigenValidos = this.productos.filter(p => 
            p.nombre.toLowerCase().includes('entero')
        );

        if (this.productosOrigenValidos.length === 0) {
            this.productosOrigenValidos = this.productos.filter(p => p.categoria_id === 1);
        }

        this.productosOrigenValidos.forEach(p => {
            selectOrigen.innerHTML += `<option value="${p.id}" data-stock="${p.stock}" data-unidad="${p.unidad_medida || 'Unidad'}">
                ${p.nombre} (Stock: ${p.stock})
            </option>`;
        });
    }

    getProductosDestino(origenId) {
        if (!origenId) return [];

        const origen = this.productos.find(p => p.id == origenId);
        if (!origen) return [];

        const nombreOrigen = origen.nombre.toLowerCase();
        let terminosValidos = [];
        let terminosExcluidos = [];

        if (nombreOrigen.includes('pollo')) {
            terminosValidos = ['pollo', 'pechuga', 'muslo', 'alas', 'milanesa', 'carcasa', 'hueso', 'recorte', 'menudencia'];
            terminosExcluidos = ['res', 'cerdo', 'aliño', 'salsa', 'entero']; 
        } else if (nombreOrigen.includes('res') || nombreOrigen.includes('carne')) {
            terminosValidos = ['res', 'bistec', 'molida', 'mechar', 'guisar', 'costilla'];
            terminosExcluidos = ['pollo', 'cerdo'];
        } else {
            return this.productos.filter(p => p.id != origenId);
        }

        return this.productos.filter(p => {
            const nombreP = p.nombre.toLowerCase();
            if (p.id == origenId) return false;
            const esValido = terminosValidos.some(t => nombreP.includes(t));
            const esExcluido = terminosExcluidos.some(t => nombreP.includes(t));
            return esValido && !esExcluido;
        });
    }

    setupEventListeners() {
        document.getElementById('origen-producto').addEventListener('change', (e) => {
            const select = e.target;
            const option = select.selectedOptions[0];
            const stockSpan = document.getElementById('stock-disponible');
            const unidadInput = document.getElementById('origen-unidad');
            
            document.getElementById('output-container').innerHTML = '';
            
            if (option && option.value) {
                const stock = option.getAttribute('data-stock');
                const unidad = option.getAttribute('data-unidad');
                stockSpan.textContent = `Stock actual: ${stock} ${unidad}`;
                unidadInput.value = unidad;
                this.agregarFilaSalida(select.value);
            } else {
                stockSpan.textContent = 'Stock actual: 0';
                unidadInput.value = '';
            }
            this.calcularTotales();
        });

        document.getElementById('origen-cantidad').addEventListener('input', () => this.calcularTotales());
        document.getElementById('btn-add-row').addEventListener('click', () => {
            const origenId = document.getElementById('origen-producto').value;
            if (!origenId) {
                this.mostrarNotificacion('Seleccione primero un producto origen', 'warning');
                return;
            }
            this.agregarFilaSalida(origenId);
        });

        document.getElementById('btn-procesar').addEventListener('click', () => this.procesarTransformacion());
    }

    agregarFilaSalida(origenId) {
        const container = document.getElementById('output-container');
        const rowId = Date.now();
        
        const productosPosibles = this.getProductosDestino(origenId);

        if (productosPosibles.length === 0) {
            this.mostrarNotificacion('No se encontraron productos derivados compatibles', 'warning');
            return;
        }

        const row = document.createElement('div');
        row.className = 'output-item';
        row.dataset.id = rowId;

        let options = '<option value="">Seleccione derivado...</option>';
        productosPosibles.forEach(p => {
            options += `<option value="${p.id}">${p.nombre}</option>`;
        });

        row.innerHTML = `
            <select class="form-control row-product">${options}</select>
            <input type="number" class="form-control row-qty" placeholder="Cant." step="0.01" min="0">
            <button class="btn btn-danger btn-sm btn-icon" onclick="transformacionManager.eliminarFila(${rowId})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        container.appendChild(row);
        row.style.opacity = 0;
        setTimeout(() => row.style.opacity = 1, 10);
        row.querySelector('.row-qty').addEventListener('input', () => this.calcularTotales());
        container.scrollTop = container.scrollHeight;
    }

    eliminarFila(id) {
        const row = document.querySelector(`.output-item[data-id="${id}"]`);
        if (row) row.remove();
        this.calcularTotales();
    }

    calcularTotales() {
        const cantOrigen = parseFloat(document.getElementById('origen-cantidad').value) || 0;
        let cantSalidaTotal = 0;

        document.querySelectorAll('.output-item').forEach(row => {
            const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
            cantSalidaTotal += qty;
        });

        document.getElementById('resumen-entrada').textContent = cantOrigen.toFixed(2);
        document.getElementById('resumen-salida').textContent = cantSalidaTotal.toFixed(2);
        
        const diferencia = cantOrigen - cantSalidaTotal;
        const diffEl = document.getElementById('resumen-diferencia');
        diffEl.textContent = diferencia.toFixed(2);

        this.actualizarBarraRendimiento(cantOrigen, cantSalidaTotal);
    }

    actualizarBarraRendimiento(entrada, salida) {
        const bar = document.getElementById('yield-bar');
        const text = document.getElementById('yield-text');
        
        if (entrada > 0) {
            const porcentaje = (salida / entrada) * 100;
            bar.style.width = `${Math.min(porcentaje, 100)}%`;
            text.textContent = `${porcentaje.toFixed(1)}% Rendimiento`;

            if (porcentaje > 100) {
                bar.style.backgroundColor = '#dc3545'; // Rojo ERROR
                text.textContent += ' (IMPOSIBLE)';
            } else if (porcentaje < 85) {
                bar.style.backgroundColor = '#ffc107'; // Amarillo
            } else {
                bar.style.backgroundColor = '#28a745'; // Verde
            }
            
            const diffEl = document.getElementById('resumen-diferencia');
            if ((entrada - salida) < 0) diffEl.style.color = 'red'; // Error visual en el número
            else diffEl.style.color = 'green';
        } else {
            bar.style.width = '0%';
            text.textContent = '0% Rendimiento';
        }
    }

    // =========================================================
    // AQUÍ ESTÁ LA LÓGICA QUE ME PEDISTE
    // =========================================================
    async procesarTransformacion() {
        const btn = document.getElementById('btn-procesar');
        const origenId = document.getElementById('origen-producto').value;
        const origenCant = parseFloat(document.getElementById('origen-cantidad').value);
        const obs = document.getElementById('observaciones').value;

        if (!origenId) return this.mostrarNotificacion('Seleccione el producto origen', 'error');
        if (!origenCant || origenCant <= 0) return this.mostrarNotificacion('Ingrese cantidad válida', 'error');

        const detalles = [];
        let totalSalida = 0; // Variable para sumar el peso de salida
        let error = false;

        document.querySelectorAll('.output-item').forEach(row => {
            const destId = row.querySelector('.row-product').value;
            const destCant = parseFloat(row.querySelector('.row-qty').value);

            if (destId && destCant > 0) {
                detalles.push({ producto_destino_id: destId, cantidad_destino: destCant });
                totalSalida += destCant; // Sumamos al total
            } else if (destId || destCant) {
                error = true;
            }
        });

        if (error) return this.mostrarNotificacion('Complete todas las filas', 'warning');
        if (detalles.length === 0) return this.mostrarNotificacion('Agregue al menos un producto de salida', 'warning');

        // --- VALIDACIÓN LÓGICA DE MASA ---
        // Permitimos un margen de error minúsculo (0.01) por redondeo de decimales, 
        // pero en general Salida > Entrada es Bloqueante.
        if (totalSalida > (origenCant + 0.01)) {
            this.mostrarNotificacion(`⛔ ERROR LÓGICO: Estás sacando ${totalSalida.toFixed(2)}kg de ${origenCant.toFixed(2)}kg disponibles. La materia no se crea de la nada.`, 'error');
            
            // Efecto visual de error
            document.getElementById('yield-bar').style.backgroundColor = '#dc3545';
            document.getElementById('resumen-diferencia').style.color = 'red';
            return; // DETIENE LA EJECUCIÓN AQUÍ
        }
        // ---------------------------------

        // Validar stock disponible en BD (Check rápido del frontend)
        const optionOrigen = document.querySelector(`#origen-producto option[value="${origenId}"]`);
        const stockActual = parseFloat(optionOrigen.getAttribute('data-stock'));
        if (origenCant > stockActual) {
            if(!confirm(`⚠️ El sistema indica que solo hay ${stockActual} en stock. ¿Deseas intentar procesar ${origenCant} de todos modos?`)) return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
            const response = await fetch('/api/transformaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    producto_origen_id: origenId,
                    cantidad_origen: origenCant,
                    observaciones: obs,
                    detalles: detalles
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al procesar');

            this.mostrarNotificacion('Transformación exitosa', 'success');
            this.resetForm();
            this.cargarHistorial();
            await this.cargarProductos();

        } catch (error) {
            this.mostrarNotificacion(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Procesar Transformación';
        }
    }

    resetForm() {
        document.getElementById('origen-producto').value = '';
        document.getElementById('origen-cantidad').value = '';
        document.getElementById('origen-unidad').value = '';
        document.getElementById('stock-disponible').textContent = 'Stock actual: 0';
        document.getElementById('observaciones').value = '';
        document.getElementById('output-container').innerHTML = '';
        this.calcularTotales();
    }

    async cargarHistorial() {
        const tbody = document.getElementById('historial-body');
        if(!tbody) return;
        
        try {
            const res = await fetch('/api/transformaciones', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await res.json();
            
            if(data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">Sin registros recientes</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(t => `
                <tr>
                    <td>#${t.id}</td>
                    <td>${new Date(t.fecha_transformacion).toLocaleDateString()}</td>
                    <td>${t.nombre_origen}</td>
                    <td><span class="badge badge-warning">-${t.cantidad_origen}</span></td>
                    <td>${t.usuario}</td>
                    <td><button class="btn btn-sm btn-info" onclick="transformacionManager.verDetalle(${t.id})"><i class="fa-solid fa-eye"></i></button></td>
                </tr>
            `).join('');
        } catch(e) { console.error(e); }
    }

    async verDetalle(id) {
        try {
            const res = await fetch(`/api/transformaciones/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const det = await res.json();
            let msg = 'Salida:\n';
            det.forEach(d => msg += `- ${d.nombre_producto}: ${d.cantidad_destino}\n`);
            alert(msg);
        } catch(e) { console.error(e); }
    }

    mostrarNotificacion(mensaje, tipo) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.textContent = mensaje;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

window.transformacionManager = new TransformacionManager();