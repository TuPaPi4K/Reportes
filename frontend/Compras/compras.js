class ComprasManager {
    constructor() {
        this.API_BASE = '/api';
        this.productos = []; 
        this.proveedores = [];
        this.itemsCarrito = [];
        this.init();
    }

    async init() {
        console.log('🛒 Inicializando Gestor de Compras...');
        document.getElementById('new-fecha').valueAsDate = new Date();
        
        await Promise.all([
            this.cargarCatalogos(),
            this.cargarCompras(),
            this.cargarEstadisticas()
        ]);

        this.setupEventListeners();
        this.injectPrintStyles(); // Estilos para imprimir solo el modal
    }

    // --- CARGA DE DATOS ---
    async cargarCatalogos() {
        try {
            const resProv = await fetch(`${this.API_BASE}/proveedores`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const dataProv = await resProv.json();
            this.proveedores = dataProv.proveedores || [];
            
            const resProd = await fetch(`${this.API_BASE}/productos`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const dataProd = await resProd.json();
            this.productos = Array.isArray(dataProd) ? dataProd : (dataProd.productos || []);

            this.llenarSelectProveedores();
        } catch (error) {
            console.error('Error cargando catálogos:', error);
            this.notificar('Error cargando datos base', 'error');
        }
    }

    llenarSelectProveedores() {
        const select = document.getElementById('new-proveedor');
        select.innerHTML = '<option value="">Seleccione proveedor...</option>';
        this.proveedores.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
    }

    // --- LOGICA DE NUEVO PEDIDO ---
    
    cambioProveedor() {
        document.getElementById('new-items-body').innerHTML = '';
        this.calcularTotalGeneral();
        this.notificar('Lista de productos actualizada para este proveedor', 'info');
    }

    agregarFilaProducto() {
        const idProveedor = document.getElementById('new-proveedor').value;
        
        if (!idProveedor) {
            return this.notificar('⚠️ Primero selecciona un proveedor', 'warning');
        }

        const productosFiltrados = this.productos.filter(p => p.id_provedores == idProveedor);

        if (productosFiltrados.length === 0) {
            return this.notificar('Este proveedor no tiene productos asignados', 'warning');
        }

        const tbody = document.getElementById('new-items-body');
        const idFila = Date.now();

        let opcionesProd = '<option value="">Seleccione producto...</option>';
        productosFiltrados.forEach(p => {
            opcionesProd += `<option value="${p.id}" data-costo="${p.costo_compra}" data-unidad="${p.unidad_medida}">${p.nombre}</option>`;
        });

        const tr = document.createElement('tr');
        tr.id = `fila-${idFila}`;
        tr.innerHTML = `
            <td>
                <select class="form-control item-producto" onchange="comprasManager.productoSeleccionado(this, ${idFila})">
                    ${opcionesProd}
                </select>
            </td>
            <td>
                <input type="number" class="form-control item-cant" value="1" min="0.01" step="0.01" oninput="comprasManager.calcularFila(${idFila})">
                <small class="text-muted unit-display" style="font-size:0.8em; display:block; text-align:right;">Unid.</small>
            </td>
            <td>
                <input type="number" class="form-control item-costo" value="0.00" min="0" step="0.01" oninput="comprasManager.calcularFila(${idFila})">
            </td>
            <td class="subtotal-cell">
                Bs. <span id="subtotal-${idFila}">0.00</span>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); comprasManager.calcularTotalGeneral();">
                    <i class="fa-solid fa-times"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }

    productoSeleccionado(select, idFila) {
        const option = select.selectedOptions[0];
        const costo = option.getAttribute('data-costo') || 0;
        const unidad = (option.getAttribute('data-unidad') || 'unidad').toLowerCase();
        
        const inputCosto = document.querySelector(`#fila-${idFila} .item-costo`);
        const inputCant = document.querySelector(`#fila-${idFila} .item-cant`);
        const unitDisplay = document.querySelector(`#fila-${idFila} .unit-display`);

        if(parseFloat(inputCosto.value) === 0) {
            inputCosto.value = costo;
        }

        unitDisplay.textContent = unidad; 
        
        const unidadesEnteras = ['unidad', 'pieza', 'bulto', 'caja', 'paquete'];
        
        if (unidadesEnteras.includes(unidad)) {
            inputCant.step = "1";
            inputCant.min = "1";
            inputCant.value = Math.round(inputCant.value) || 1;
            inputCant.onkeypress = function(e) { return (e.charCode >= 48 && e.charCode <= 57); };
        } else {
            inputCant.step = "0.01";
            inputCant.min = "0.01";
            inputCant.onkeypress = null; 
        }

        this.calcularFila(idFila);
    }

    calcularFila(idFila) {
        const fila = document.getElementById(`fila-${idFila}`);
        if(!fila) return;

        const cant = parseFloat(fila.querySelector('.item-cant').value) || 0;
        const costo = parseFloat(fila.querySelector('.item-costo').value) || 0;
        const subtotal = cant * costo;

        document.getElementById(`subtotal-${idFila}`).textContent = subtotal.toFixed(2);
        this.calcularTotalGeneral();
    }

    calcularTotalGeneral() {
        let total = 0;
        document.querySelectorAll('[id^="subtotal-"]').forEach(span => {
            total += parseFloat(span.textContent);
        });
        document.getElementById('new-total').textContent = `Bs. ${total.toFixed(2)}`;
    }

    async guardarPedido(e) {
        e.preventDefault();
        const btn = document.querySelector('#form-nuevo-pedido button[type="submit"]');
        
        const idProveedor = document.getElementById('new-proveedor').value;
        if(!idProveedor) return this.notificar('Seleccione un proveedor', 'error');

        const detalles = [];
        document.querySelectorAll('#new-items-body tr').forEach(tr => {
            const idProd = tr.querySelector('.item-producto').value;
            const cant = tr.querySelector('.item-cant').value;
            const costo = tr.querySelector('.item-costo').value;

            if(idProd && cant > 0) {
                detalles.push({
                    id_producto: idProd,
                    cantidad: parseFloat(cant),
                    precio_compra: parseFloat(costo)
                });
            }
        });

        if(detalles.length === 0) return this.notificar('Agregue al menos un producto válido', 'error');

        const payload = {
            id_proveedor: idProveedor,
            num_factura: document.getElementById('new-factura').value,
            observaciones: document.getElementById('new-obs').value,
            detalles: detalles
        };

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
            const res = await fetch(`${this.API_BASE}/compras`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
                body: JSON.stringify(payload)
            });

            if(!res.ok) throw new Error('Error guardando pedido');

            this.notificar('Pedido registrado correctamente', 'success');
            document.getElementById('form-nuevo-pedido').reset();
            document.getElementById('new-items-body').innerHTML = '';
            this.calcularTotalGeneral();
            
            document.getElementById('tab-pedidos').click();
            this.cambiarTab('pedidos');
            this.cargarCompras();
            this.cargarEstadisticas();

        } catch (error) {
            this.notificar(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Pedido';
        }
    }

    // --- LISTADO Y RECEPCIÓN ---
    async cargarCompras() {
        const tbody = document.getElementById('tabla-pedidos-body');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando...</td></tr>';

        try {
            const estado = document.getElementById('filtro-estado').value;
            let url = `${this.API_BASE}/compras`;
            if(estado) url += `?estado=${estado}`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.getToken()}` } });
            const data = await res.json();

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay registros</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(c => {
                const fecha = new Date(c.fecha_compra).toLocaleDateString();
                const total = parseFloat(c.total).toFixed(2);
                let badge = '', acciones = '';
                
                if (c.estado === 'pendiente') {
                    badge = '<span class="status-badge pendiente">Pendiente</span>';
                    acciones = `<button class="btn btn-sm btn-success" onclick="comprasManager.abrirRecibir(${c.id})"><i class="fa-solid fa-box-open"></i> Recibir</button>`;
                } else {
                    badge = '<span class="status-badge pagada">Recibido</span>';
                    acciones = `<button class="btn btn-sm btn-primary" onclick="comprasManager.verFactura(${c.id})"><i class="fa-solid fa-file-invoice"></i> Factura</button>`;
                }

                return `
                    <tr>
                        <td><span class="id-badge">#${c.id}</span> <small class="text-muted">${c.num_factura || ''}</small></td>
                        <td>${c.proveedor_nombre || 'N/A'}</td>
                        <td>${fecha}</td>
                        <td>${badge}</td>
                        <td><strong>Bs. ${total}</strong></td>
                        <td><div class="action-buttons">${acciones}</div></td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar</td></tr>';
        }
    }

    async abrirRecibir(idCompra) {
        try {
            const res = await fetch(`${this.API_BASE}/compras/${idCompra}`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const data = await res.json();
            
            document.getElementById('recibir-compra-id').value = idCompra;
            const tbody = document.getElementById('recibir-body');
            tbody.innerHTML = '';

            data.detalles.forEach(d => {
                tbody.innerHTML += `
                    <tr data-detalle-id="${d.id}" data-prod-id="${d.id_producto}">
                        <td>${d.producto_nombre}</td>
                        <td>${d.cantidad} ${d.unidad_medida || 'u'}</td>
                        <td>
                            <input type="number" class="form-control receive-qty" value="${d.cantidad}" min="0" step="0.01">
                        </td>
                    </tr>
                `;
            });

            document.getElementById('modal-recibir').classList.add('active');
        } catch (error) {
            this.notificar('Error cargando detalles', 'error');
        }
    }

    async confirmarRecepcion() {
        const idCompra = document.getElementById('recibir-compra-id').value;
        const items = [];

        document.querySelectorAll('#recibir-body tr').forEach(tr => {
            const qty = tr.querySelector('.receive-qty').value;
            items.push({
                id_detalle: tr.getAttribute('data-detalle-id'),
                id_producto: tr.getAttribute('data-prod-id'),
                cantidad_recibida: parseFloat(qty),
                lote: 'Gen', 
                fecha_vencimiento: null 
            });
        });

        if(!confirm('¿Confirmar ingreso? Se sumará el stock y se actualizará el costo.')) return;

        try {
            const res = await fetch(`${this.API_BASE}/compras/${idCompra}/recibir`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
                body: JSON.stringify({ detalles_recibidos: items })
            });

            if(!res.ok) throw new Error('Error al recibir');

            this.notificar('Mercancía ingresada correctamente', 'success');
            this.cerrarModal('modal-recibir');
            this.cargarCompras();
            this.cargarEstadisticas();

        } catch (error) {
            this.notificar(error.message, 'error');
        }
    }

    // ✅ FUNCIÓN ACTUALIZADA: VER FACTURA EN MODAL (NO POPUP)
    async verFactura(id) {
        try {
            const res = await fetch(`${this.API_BASE}/compras/${id}/factura`, { 
                headers: { 'Authorization': `Bearer ${this.getToken()}` } 
            });
            if(!res.ok) throw new Error("Datos incompletos");
            
            const data = await res.json();
            const { empresa, proveedor, compra, items } = data;

            // Generamos el HTML de la factura
            const html = `
            <div class="invoice-container" style="font-family: 'Poppins', sans-serif; color: #374151; padding: 20px; background: white;">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px;">
                    <div>
                        <h3 style="font-size: 1.5rem; font-weight: bold; color: #1f2937; margin: 0;">${empresa.nombre_empresa}</h3>
                        <p style="color: #6b7280; margin: 5px 0;">RIF: ${empresa.rif}</p>
                        <p style="color: #6b7280; margin: 0;">${empresa.direccion}</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="font-size: 1.5rem; font-weight: bold; color: #5a00b3;">COMPRA #${compra.id}</h3>
                        <p style="color: #6b7280; margin: 5px 0;">Factura Prov: ${compra.numero_factura || 'N/A'}</p>
                        <p style="color: #6b7280; margin: 0;">Fecha: ${new Date(compra.fecha).toLocaleDateString()}</p>
                        <span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">${compra.estado.toUpperCase()}</span>
                    </div>
                </div>

                <div style="margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <h4 style="font-weight: bold; color: #1f2937; margin-bottom: 10px;">DATOS DEL PROVEEDOR</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
                        <div><strong>Razón Social:</strong> ${proveedor.nombre}</div>
                        <div><strong>RIF/CI:</strong> ${proveedor.rif || 'N/A'}</div>
                        <div><strong>Contacto:</strong> ${proveedor.contacto || '-'}</div>
                        <div><strong>Dirección:</strong> ${proveedor.direccion || '-'}</div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead style="background: #f3f4f6;">
                        <tr>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Descripción</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Cant.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Costo Unit.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 12px;">${item.producto} <small style="color:#888">(${item.unidad})</small></td>
                                <td style="padding: 12px; text-align: center;">${item.cantidad}</td>
                                <td style="padding: 12px; text-align: right;">Bs. ${item.precio.toFixed(2)}</td>
                                <td style="padding: 12px; text-align: right;">Bs. ${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="display: flex; justify-content: flex-end;">
                    <div style="width: 250px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #e5e7eb;">
                            <span style="font-weight: bold; font-size: 1.1rem;">TOTAL:</span>
                            <span style="font-weight: bold; font-size: 1.1rem; color: #5a00b3;">Bs. ${data.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 0.8rem; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <p>${empresa.mensaje_factura}</p>
                    <p>Sistema Administrativo Na'Guara</p>
                </div>

                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" class="btn btn-primary" style="padding: 10px 25px; font-size: 1rem;">
                        <i class="fa-solid fa-print"></i> Imprimir Comprobante
                    </button>
                </div>
            </div>
            `;

            // Inyectamos el HTML en el modal existente
            document.getElementById('ver-detalles-body').innerHTML = html;
            
            // Mostramos el modal
            document.getElementById('modal-detalles').classList.add('active');

        } catch (e) { 
            console.error(e); 
            this.notificar('Error generando factura', 'error');
        }
    }

    // --- ESTILOS PARA IMPRIMIR ---
    injectPrintStyles() {
        // Este CSS asegura que al darle a Imprimir solo salga el modal y se vea perfecto
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body * { visibility: hidden; }
                #modal-detalles, #modal-detalles * { visibility: visible; }
                #modal-detalles {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: auto;
                    background: white;
                    z-index: 9999;
                    overflow: visible;
                }
                .modal-content {
                    box-shadow: none;
                    border: none;
                    max-height: none; /* Permitir que crezca */
                    overflow: visible;
                    transform: none !important;
                }
                .no-print, .modal-header, .close-btn, .modal-footer {
                    display: none !important;
                }
                /* Resetear márgenes para aprovechar la hoja */
                @page { margin: 1.5cm; }
            }
        `;
        document.head.appendChild(style);
    }

    async cargarEstadisticas() {
        try {
            const res = await fetch(`${this.API_BASE}/compras/stats/estadisticas`, { headers: { 'Authorization': `Bearer ${this.getToken()}` } });
            const data = await res.json();
            if(data.estadisticas) {
                document.getElementById('stats-total-mes').textContent = `Bs. ${parseFloat(data.estadisticas.total_invertido || 0).toFixed(2)}`;
                document.getElementById('stats-pendientes').textContent = data.estadisticas.compras_pendientes || 0;
                document.getElementById('stats-recibidos').textContent = data.estadisticas.compras_recibidas || 0;
            }
        } catch(e) { console.warn(e); }
    }

    setupEventListeners() {
        document.getElementById('search-pedidos')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#tabla-pedidos-body tr');
            rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; });
        });

        document.getElementById('form-nuevo-pedido')?.addEventListener('submit', (e) => this.guardarPedido(e));
        
        // Listener para cambio de proveedor
        document.getElementById('new-proveedor')?.addEventListener('change', () => this.cambioProveedor());
    }

    cambiarTab(tab) {
        document.getElementById('content-pedidos').style.display = tab === 'pedidos' ? 'block' : 'none';
        document.getElementById('content-nuevo-pedido').style.display = tab === 'nuevo' ? 'block' : 'none';
        
        if(tab === 'nuevo') {
            if(document.getElementById('new-proveedor').value) {
                if(this.itemsCarrito.length === 0) this.agregarFilaProducto(); 
            } else {
                document.getElementById('new-items-body').innerHTML = '';
            }
        }
    }

    cerrarModal(id) { document.getElementById(id).classList.remove('active'); }
    getToken() { return localStorage.getItem('authToken'); }
    notificar(msg, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

window.comprasManager = new ComprasManager();