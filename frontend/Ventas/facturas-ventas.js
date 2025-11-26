// facturas-ventas.js - Módulo de gestión de facturas
class FacturasManager {
    constructor() {
        this.API_BASE = 'http://localhost:3000/api';
        this.facturaSeleccionada = null;
        this.paginacionActual = {};
        this.facturasActuales = [];
        this.filtrosAplicados = false;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.applyUrlFilters();
        this.cargarFacturas();
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('btnBuscar').addEventListener('click', () => this.cargarFacturas());
        document.getElementById('btnExportar').addEventListener('click', () => this.exportarFacturas());
        
        // Modales - cerrar
        document.getElementById('closeDetalles').addEventListener('click', () => this.cerrarModal('modalDetalles'));
        document.getElementById('closeAnular').addEventListener('click', () => this.cerrarModal('modalAnular'));
        document.getElementById('cancelarAnulacion').addEventListener('click', () => this.cerrarModal('modalAnular'));
        
        // Modal anular - confirmar
        document.getElementById('confirmarAnulacion').addEventListener('click', () => this.confirmarAnulacion());
        
        // Cerrar modales al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.cerrarModal(e.target.id);
            }
        });
    }

    initializeDates() {
        const fechaInicio = document.getElementById('fechaInicio').value;
        const fechaFin = document.getElementById('fechaFin').value;
        
        if (!fechaInicio && !fechaFin) {
            const hoy = new Date();
            const hace30Dias = new Date();
            hace30Dias.setDate(hoy.getDate() - 30);

            document.getElementById('fechaInicio').value = hace30Dias.toISOString().split('T')[0];
            document.getElementById('fechaFin').value = hoy.toISOString().split('T')[0];
        }
    }

    applyUrlFilters() {
        const urlParams = new URLSearchParams(window.location.search);
        const fechaParam = urlParams.get('fecha');
        
        if (fechaParam && this.isValidDate(fechaParam)) {
            document.getElementById('fechaInicio').value = fechaParam;
            document.getElementById('fechaFin').value = fechaParam;
            this.mostrarIndicadorFecha(fechaParam);
            console.log('✅ Filtro de fecha aplicado desde URL:', fechaParam);
        } else {
            this.initializeDates();
        }
    }

    isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    mostrarIndicadorFecha(fecha) {
        const fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let indicador = document.getElementById('filtro-fecha-activo');
        if (!indicador) {
            indicador = document.createElement('div');
            indicador.id = 'filtro-fecha-activo';
            indicador.className = 'filtro-activo';
            
            const cardHeader = document.querySelector('.card-header');
            if (cardHeader) {
                cardHeader.parentNode.insertBefore(indicador, cardHeader.nextSibling);
            }
        }
        
        indicador.innerHTML = `
            <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 12px; margin: 10px 0;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-calendar-check" style="color: #10b981;"></i>
                    <strong style="color: #065f46;">Filtro activo:</strong>
                    <span style="color: #065f46;">Mostrando ventas del ${fechaFormateada}</span>
                </div>
                <button onclick="facturasManager.quitarFiltroFecha()" 
                        style="margin-top: 8px; background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    <i class="fas fa-times"></i> Quitar filtro
                </button>
            </div>
        `;
    }

    quitarFiltroFecha() {
        const url = new URL(window.location);
        url.searchParams.delete('fecha');
        window.history.replaceState({}, '', url);
        
        const indicador = document.getElementById('filtro-fecha-activo');
        if (indicador) indicador.remove();
        
        this.initializeDates();
        this.cargarFacturas();
    }
    
    async cargarFacturas(pagina = 1) {
        try {
            this.mostrarLoading(true);
            
            const fechaInicio = document.getElementById('fechaInicio').value;
            const fechaFin = document.getElementById('fechaFin').value;
            const cliente = document.getElementById('clienteFilter').value;
            const metodoPago = document.getElementById('metodoPagoFilter').value;
            const estado = document.getElementById('estadoFilter').value;

            const params = new URLSearchParams({
                page: pagina,
                limit: 20
            });

            if (estado) {
                params.append('estado', estado);
            }

            if (fechaInicio && fechaFin) {
                if (fechaInicio === fechaFin) {
                    params.append('fecha_inicio', fechaInicio);
                    params.append('fecha_fin', fechaInicio);
                } else {
                    params.append('fecha_inicio', fechaInicio);
                    params.append('fecha_fin', fechaFin);
                }
            }

            if (cliente) {
                params.append('cliente', cliente);
            }
            if (metodoPago) {
                params.append('metodo_pago', metodoPago);
            }

            console.log('🔍 Buscando facturas con parámetros:', Object.fromEntries(params));

            const response = await fetch(`${this.API_BASE}/facturas-venta?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Error al cargar facturas');

            const data = await response.json();
            this.mostrarFacturas(data.facturas);
            this.mostrarPaginacion(data.paginacion);
            this.paginacionActual = data.paginacion;

            await this.cargarEstadisticas();

        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error al cargar las facturas');
        } finally {
            this.mostrarLoading(false);
        }
    }    

    mostrarFacturas(facturas) {
        const tbody = document.getElementById('facturasBody');
        tbody.innerHTML = '';

        this.facturasActuales = facturas; 

        if (facturas.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML();
            return;
        }

        facturas.forEach(factura => {
            const tr = this.crearFilaFactura(factura);
            tbody.appendChild(tr);
        });
    }

    crearFilaFactura(factura) {
        const total = parseFloat(factura.total) || 0;
        const fecha = new Date(factura.fecha_venta).toLocaleDateString();
        
        const estadoClass = factura.estado === 'completada' ? 'badge-success' : 'badge-danger';
        const estadoTexto = factura.estado === 'completada' ? 'Completada' : 'Anulada';
        
        const mostrarAcciones = factura.estado === 'completada';
        
        const tr = document.createElement('tr');
        
        if (factura.estado === 'anulada') {
            tr.style.opacity = '0.7';
            tr.style.backgroundColor = '#fef2f2';
        }
        
        tr.innerHTML = `
            <td>
                <strong>F-${factura.id.toString().padStart(6, '0')}</strong>
                ${factura.estado === 'anulada' ? '<br><small class="text-red-600">ANULADA</small>' : ''}
            </td>
            <td>${fecha}</td>
            <td>${factura.cliente_nombre || 'N/A'}</td>
            <td>${factura.vendedor_nombre || 'N/A'}</td>
            <td>
                <span class="badge ${this.getBadgeClass(factura.metodo_pago)}">
                    ${this.formatearMetodoPago(factura.metodo_pago)}
                </span>
            </td>
            <td>
                <strong>$${total.toFixed(2)}</strong>
                ${factura.estado === 'anulada' ? '<br><small class="text-red-600">(Anulada)</small>' : ''}
            </td>
            <td>
                <span class="badge ${estadoClass}">
                    ${estadoTexto}
                </span>
                ${factura.motivo_anulacion ? `<br><small title="${factura.motivo_anulacion}">${this.truncarTexto(factura.motivo_anulacion, 20)}</small>` : ''}
            </td>
            <td>
                <button class="btn-sm btn-primary" onclick="facturasManager.verDetalles(${factura.id})" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                ${mostrarAcciones ? `
                <button class="btn-sm btn-warning" onclick="facturasManager.reimprimirFactura(${factura.id})" title="Reimprimir">
                    <i class="fas fa-print"></i>
                </button>
                <button class="btn-sm btn-danger" onclick="facturasManager.solicitarAnulacion(${factura.id})" title="Anular">
                    <i class="fas fa-ban"></i>
                </button>
                ` : `
                <button class="btn-sm btn-secondary" onclick="facturasManager.verDetalles(${factura.id})" title="Ver detalles de anulación">
                    <i class="fas fa-info-circle"></i>
                </button>
                `}
            </td>
        `;
        return tr;
    }

    truncarTexto(texto, longitud) {
        if (texto.length <= longitud) return texto;
        return texto.substring(0, longitud) + '...';
    }

    mostrarPaginacion(paginacion) {
        const container = document.getElementById('paginacion');
        container.innerHTML = '';

        if (paginacion.total_paginas <= 1) return;

        const { pagina_actual, total_paginas } = paginacion;

        if (pagina_actual > 1) {
            container.innerHTML += `
                <button class="btn-pagination" onclick="facturasManager.cargarFacturas(${pagina_actual - 1})">
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
            `;
        }

        for (let i = 1; i <= total_paginas; i++) {
            if (i === pagina_actual) {
                container.innerHTML += `<span class="page-current">${i}</span>`;
            } else {
                container.innerHTML += `
                    <button class="btn-pagination" onclick="facturasManager.cargarFacturas(${i})">${i}</button>
                `;
            }
        }

        if (pagina_actual < total_paginas) {
            container.innerHTML += `
                <button class="btn-pagination" onclick="facturasManager.cargarFacturas(${pagina_actual + 1})">
                    Siguiente <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
    }

    async cargarEstadisticas() {
        try {
            const params = new URLSearchParams({
                fecha_inicio: document.getElementById('fechaInicio').value,
                fecha_fin: document.getElementById('fechaFin').value
            });

            const response = await fetch(`${this.API_BASE}/facturas-venta/estadisticas?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Error al cargar estadísticas');
            }

            const data = await response.json();
            this.mostrarEstadisticas(data);

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.mostrarEstadisticas({
                total_facturas: 0,
                total_ventas: 0,
                promedio_venta: 0,
                facturas_anuladas: 0
            });
        }
    }

    mostrarEstadisticas(data) {
        const container = document.getElementById('estadisticasContainer');
        
        let estadisticas;
        
        if (data && data.estadisticas) {
            estadisticas = data.estadisticas;
        } else if (data && data.total_facturas !== undefined) {
            estadisticas = data;
        } else {
            estadisticas = {};
        }
        
        const getSafeNumber = (value) => {
            if (value === null || value === undefined) return 0;
            const num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        };
        
        const totalFacturas = getSafeNumber(estadisticas.total_facturas);
        const totalVentas = getSafeNumber(estadisticas.total_ventas);
        const promedioVenta = getSafeNumber(estadisticas.promedio_venta);
        const facturasAnuladas = getSafeNumber(estadisticas.facturas_anuladas);

        container.innerHTML = `
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-icon" style="background: #5a00b3;">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalFacturas}</h3>
                        <p>Total Facturas</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-icon" style="background: #10b981;">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3>$${totalVentas.toFixed(2)}</h3>
                        <p>Total Ventas</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-icon" style="background: #f59e0b;">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-info">
                        <h3>$${promedioVenta.toFixed(2)}</h3>
                        <p>Promedio por Venta</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-icon" style="background: #ef4444;">
                        <i class="fas fa-ban"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${facturasAnuladas}</h3>
                        <p>Facturas Anuladas</p>
                    </div>
                </div>
            </div>
        `;
    }

    async verDetalles(id) {
        try {
            this.mostrarLoading(true);
            
            const response = await fetch(`${this.API_BASE}/ventas/${id}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Error al cargar detalles');

            const factura = await response.json();
            this.mostrarModalDetalles(factura);

        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error al cargar los detalles de la factura');
        } finally {
            this.mostrarLoading(false);
        }
    }

  mostrarModalDetalles(factura) {
        const modalBody = document.getElementById('detallesFacturaBody');
        
        const empresa = {
            nombre_empresa: "Pollera Na'Guara",
            rif: "J-123456789",
            telefono: "(0412) 123-4567",
            direccion: "Barquisimeto, Venezuela",
            mensaje_factura: "¡Gracias por su compra!"
        };

        // ✅ CALCULAR IVA POR PRODUCTO (CORREGIDO)
        let subtotal_bs = 0;
        let tax_bs = 0;
        const desgloseIva = {};

        (factura.detalles || []).forEach(detalle => {
            const cantidad = parseFloat(detalle.cantidad) || 0;
            const precio_unitario = parseFloat(detalle.precio_unitario) || 0;
            
            // CORRECCIÓN: Verificar null/undefined para permitir el 0
            const tasa_iva = (detalle.tasa_iva !== null && detalle.tasa_iva !== undefined) 
                             ? parseFloat(detalle.tasa_iva) 
                             : 16;
            
            const precio_sin_iva = precio_unitario / (1 + (tasa_iva / 100));
            const iva_linea = precio_sin_iva * (tasa_iva / 100) * cantidad;
            
            subtotal_bs += precio_sin_iva * cantidad;
            tax_bs += iva_linea;
            
            const claveIva = `${tasa_iva}%`;
            if (!desgloseIva[claveIva]) {
                desgloseIva[claveIva] = 0;
            }
            desgloseIva[claveIva] += iva_linea;
        });

        const total_bs = subtotal_bs + tax_bs;

        // ✅ GENERAR DESGLOSE DE IVA
        let desgloseIvaHTML = '';
        Object.keys(desgloseIva).forEach(tipo => {
            desgloseIvaHTML += `
                <div class="flex justify-between text-sm">
                    <span>IVA ${tipo}:</span>
                    <span>Bs. ${desgloseIva[tipo].toFixed(2)}</span> </div>
            `;
        });

        const invoiceHTML = `
            <div class="invoice-container" style="max-width: 100%;">
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${empresa.nombre_empresa}</h3>
                        <p class="text-gray-600 text-sm">Sistema de Venta Rápida</p>
                        <p class="text-gray-600 text-sm">RIF: ${empresa.rif}</p>
                        <p class="text-gray-600 text-sm">Teléfono: ${empresa.telefono}</p>
                        <p class="text-gray-600 text-sm">${empresa.direccion}</p>
                    </div>
                    <div class="text-right">
                        <h3 class="text-xl font-bold text-purple-600">FACTURA #${factura.id.toString().padStart(6, '0')}</h3>
                        <p class="text-gray-600 text-sm">Fecha: ${new Date(factura.fecha_venta).toLocaleDateString('es-ES')}</p>
                        <p class="text-gray-600 text-sm">Hora: ${new Date(factura.fecha_venta).toLocaleTimeString('es-ES')}</p>
                    </div>
                </div>

                <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 class="font-bold text-gray-800 mb-2 text-sm">INFORMACIÓN DEL CLIENTE</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p><strong>Nombre:</strong> ${factura.cliente?.nombre || 'N/A'}</p>
                            <p><strong>Cédula/RIF:</strong> ${factura.cliente?.cedula_rif || 'N/A'}</p>
                        </div>
                        <div>
                            <p><strong>Teléfono:</strong> ${factura.cliente?.telefono || 'No especificado'}</p>
                            <p><strong>Dirección:</strong> ${factura.cliente?.direccion || 'No especificada'}</p>
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <h4 class="font-bold text-gray-800 mb-3 text-sm">DETALLES DE LA VENTA</h4>
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="border border-gray-300 p-2 text-left">Producto</th>
                                <th class="border border-gray-300 p-2 text-center">Cantidad</th>
                                <th class="border border-gray-300 p-2 text-center">IVA</th>
                                <th class="border border-gray-300 p-2 text-right">Precio Unit.</th>
                                <th class="border border-gray-300 p-2 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(factura.detalles || []).map(detalle => {
                                const cantidad = parseFloat(detalle.cantidad) || 0;
                                const precio_unitario = parseFloat(detalle.precio_unitario) || 0;
                                
                                // CORRECCIÓN DE TASA
                                const tasa_iva = (detalle.tasa_iva !== null && detalle.tasa_iva !== undefined) 
                                                 ? parseFloat(detalle.tasa_iva) 
                                                 : 16;
                                                 
                                const subtotal = cantidad * precio_unitario;
                                
                                return `
                                    <tr>
                                        <td class="border border-gray-300 p-2">${detalle.producto_nombre || 'N/A'}</td>
                                        <td class="border border-gray-300 p-2 text-center">${cantidad} ${detalle.unidad_medida || 'unidad'}</td>
                                        <td class="border border-gray-300 p-2 text-center">
                                            ${tasa_iva === 0 ? 
                                              '<span class="text-green-600 text-xs">EXENTO</span>' : 
                                              `${tasa_iva}%`}
                                        </td>
                                        <td class="border border-gray-300 p-2 text-right">Bs. ${precio_unitario.toFixed(2)}</td>
                                        <td class="border border-gray-300 p-2 text-right">Bs. ${subtotal.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="p-3 bg-purple-50 rounded-lg">
                        <h4 class="font-bold text-purple-800 mb-2 text-sm">MÉTODO DE PAGO</h4>
                        <p class="text-purple-700 font-semibold text-sm">${this.formatearMetodoPago(factura.metodo_pago)}</p>
                        ${factura.detalles_pago ? this.mostrarDetallesPagoFormateados(factura.detalles_pago, factura.metodo_pago) : ''}
                    </div>

                    <div class="p-3 bg-gray-50 rounded-lg">
                        <h4 class="font-bold text-gray-800 mb-2 text-sm">RESUMEN</h4>
                        <div class="space-y-1 text-sm">
                            <div class="flex justify-between">
                                <span>Subtotal:</span>
                                <span>Bs. ${subtotal_bs.toFixed(2)}</span>
                            </div>
                            ${desgloseIvaHTML}
                            <div class="flex justify-between font-bold border-t border-gray-300 pt-1 mt-1">
                                <span>TOTAL:</span>
                                <span class="text-purple-600">Bs. ${total_bs.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-4 text-center text-gray-500 text-xs">
                    <p><strong>Vendedor:</strong> ${factura.vendedor || 'N/A'}</p>
                    <p>${empresa.mensaje_factura}</p>
                    <p>${empresa.nombre_empresa} - Sistema de Venta Rápida</p>
                    <p>Consulta generada el ${new Date().toLocaleString('es-ES')}</p>
                </div>
            </div>
        `;

        modalBody.innerHTML = invoiceHTML;
        this.abrirModal('modalDetalles');
    }


    calcularDesgloseIva(detalles) {
        const desgloseIva = {};
        
        detalles.forEach(detalle => {
            const cantidad = parseFloat(detalle.cantidad) || 0;
            const precio_unitario = parseFloat(detalle.precio_unitario) || 0;
            const tasa_iva = parseFloat(detalle.tasa_iva) || 16;
            
            // ✅ CÁLCULO CORRECTO DEL IVA
            const subtotal_linea = cantidad * precio_unitario;
            const iva_linea = subtotal_linea * (tasa_iva / 100);
            
            const claveIva = `${tasa_iva}%`;
            if (!desgloseIva[claveIva]) {
                desgloseIva[claveIva] = 0;
            }
            desgloseIva[claveIva] += iva_linea;
        });
        
        return desgloseIva;
    }

    mostrarDetallesPagoFormateados(detallesPago, metodoPago) {
        if (!detallesPago) return '';
        
        let detalles = detallesPago;
        if (typeof detallesPago === 'string') {
            try {
                detalles = JSON.parse(detallesPago);
            } catch (e) {
                return `<div class="mt-2 text-xs text-gray-600">${detallesPago}</div>`;
            }
        }

        let html = '<div class="mt-2 space-y-1 text-xs">';

        switch (metodoPago) {
            case 'pago_movil':
            case 'transferencia':
                html += `
                    <div><strong>Banco:</strong> ${detalles.bank || detalles.banco || 'No especificado'}</div>
                    <div><strong>Referencia:</strong> ${detalles.reference || detalles.referencia || 'No especificada'}</div>
                    <div><strong>Cédula Titular:</strong> ${detalles.holderId || detalles.cedula_titular || 'No especificada'}</div>
                    <div><strong>Monto:</strong> $${parseFloat(detalles.amount || detalles.total || 0).toFixed(2)}</div>
                `;
                break;
                
            case 'efectivo_usd':
                html += `
                    <div><strong>Monto Recibido:</strong> $${parseFloat(detalles.received || 0).toFixed(2)}</div>
                    <div><strong>Cambio:</strong> $${parseFloat(detalles.change || 0).toFixed(2)}</div>
                    <div><strong>Tasa:</strong> ${parseFloat(detalles.tasa || 0).toFixed(2)} Bs/$</div>
                `;
                break;
                
            case 'efectivo_bs':
                html += `
                    <div><strong>Monto Recibido:</strong> $${parseFloat(detalles.received || 0).toFixed(2)}</div>
                    <div><strong>Cambio:</strong> $${parseFloat(detalles.change || 0).toFixed(2)}</div>
                `;
                break;
                
            case 'punto_venta':
                html += `
                    <div><strong>Referencia:</strong> ${detalles.reference || detalles.referencia || 'No especificada'}</div>
                    <div><strong>Monto:</strong> $${parseFloat(detalles.amount || detalles.total || 0).toFixed(2)}</div>
                `;
                break;
                
            case 'mixto':
                if (detalles.payments && Array.isArray(detalles.payments)) {
                    detalles.payments.forEach(payment => {
                        html += `<div><strong>${this.formatearMetodoPago(payment.method)}:</strong> $${parseFloat(payment.amount || 0).toFixed(2)}</div>`;
                    });
                }
                break;
                
            default:
                html += `<div class="text-gray-600">Información de pago disponible</div>`;
        }

        html += '</div>';
        return html;
    }

    solicitarAnulacion(id) {
        this.facturaSeleccionada = id;
        document.getElementById('motivoAnulacion').value = '';
        this.abrirModal('modalAnular');
    }

    async confirmarAnulacion() {
        const motivo = document.getElementById('motivoAnulacion').value.trim();
        
        if (!motivo) {
            this.mostrarError('Por favor ingrese el motivo de la anulación');
            return;
        }

        try {
            this.mostrarLoading(true);
            
            const response = await fetch(`${this.API_BASE}/facturas-venta/${this.facturaSeleccionada}/anular`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ motivo }),
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            this.mostrarExito('Factura anulada exitosamente');
            this.cerrarModal('modalAnular');
            
            const estadoFiltro = document.getElementById('estadoFilter').value;
            if (!estadoFiltro) {
                this.cargarFacturas(this.paginacionActual.pagina_actual);
            } else {
                document.getElementById('estadoFilter').value = '';
                this.cargarFacturas(1);
            }

        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error al anular la factura: ' + error.message);
        } finally {
            this.mostrarLoading(false);
        }
    }

    async reimprimirFactura(id) {
        try {
            console.log('🖨️ Preparando reimpresión de factura:', id);
            
            const response = await fetch(`${this.API_BASE}/facturas-venta/${id}/reimprimir`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Error al cargar datos para reimpresión');
            }

            const facturaData = await response.json();
            this.mostrarVentanaImpresion(facturaData);

        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error al cargar la factura para reimpresión');
        }
    }

   mostrarVentanaImpresion(facturaData) {
        const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
        
        if (!ventanaImpresion) {
            this.mostrarError('Por favor permite las ventanas emergentes para la impresión');
            return;
        }

        const { factura, empresa, cliente, vendedor, items, detalles_pago } = facturaData;

        // ✅ CALCULAR IVA POR PRODUCTO (CORREGIDO)
        let subtotal_bs = 0;
        let tax_bs = 0;
        const desgloseIva = {};

        (items || []).forEach(item => {
            const cantidad = parseFloat(item.cantidad) || 0;
            const precio_unitario = parseFloat(item.precio_unitario) || 0;
            
            // CORRECCIÓN: Verificar null/undefined correctamente para el 0
            const tasa_iva = (item.tasa_iva !== null && item.tasa_iva !== undefined) 
                             ? parseFloat(item.tasa_iva) 
                             : 16;
            
            const precio_sin_iva = precio_unitario / (1 + (tasa_iva / 100));
            const iva_linea = precio_sin_iva * (tasa_iva / 100) * cantidad;
            
            subtotal_bs += precio_sin_iva * cantidad;
            tax_bs += iva_linea;
            
            const claveIva = `${tasa_iva}%`;
            if (!desgloseIva[claveIva]) {
                desgloseIva[claveIva] = 0;
            }
            desgloseIva[claveIva] += iva_linea;
        });

        const total_bs = subtotal_bs + tax_bs;

        // ✅ GENERAR DESGLOSE DE IVA
        let desgloseIvaHTML = '';
        Object.keys(desgloseIva).forEach(tipo => {
            desgloseIvaHTML += `
                <div class="flex justify-between text-sm">
                    <span>IVA ${tipo}:</span>
                    <span>Bs. ${desgloseIva[tipo].toFixed(2)}</span>
                </div>
            `;
        });

        const htmlImpresion = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Factura ${factura.numero_factura}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { 
                        font-family: 'Poppins', sans-serif; 
                        background: white;
                        color: #374151;
                        margin: 0;
                        padding: 20px;
                    }
                    @media print {
                        body { margin: 0; padding: 15px; }
                        .no-print { display: none !important; }
                        .break-before { page-break-before: always; }
                    }
                </style>
            </head>
            <body class="bg-white">
                <div class="max-w-4xl mx-auto">
                    <div class="grid grid-cols-2 gap-6 mb-8 border-b border-gray-300 pb-6">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-800">${empresa?.nombre_empresa || "Pollera Na'Guara"}</h1>
                            <p class="text-gray-600 text-sm">Sistema de Venta Rápida</p>
                            <p class="text-gray-600 text-sm">RIF: ${empresa?.rif || 'J-123456789'}</p>
                            <p class="text-gray-600 text-sm">Teléfono: ${empresa?.telefono || '(0412) 123-4567'}</p>
                            <p class="text-gray-600 text-sm">${empresa?.direccion || 'Barquisimeto, Venezuela'}</p>
                        </div>
                        <div class="text-right">
                            <h2 class="text-2xl font-bold text-purple-600">FACTURA</h2>
                            <p class="text-gray-600 text-sm">N°: ${factura.numero_factura || `F-${factura.id.toString().padStart(6, '0')}`}</p>
                            <p class="text-gray-600 text-sm">Fecha: ${new Date(factura.fecha_venta).toLocaleDateString('es-ES')}</p>
                            <p class="text-gray-600 text-sm">Hora: ${new Date(factura.fecha_venta).toLocaleTimeString('es-ES')}</p>
                            <p class="text-gray-600 text-sm">Reimpresión: ${new Date().toLocaleString('es-ES')}</p>
                        </div>
                    </div>

                    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 class="font-bold text-gray-800 mb-2 text-sm">INFORMACIÓN DEL CLIENTE</h3>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p><strong>Nombre:</strong> ${cliente?.nombre || 'N/A'}</p>
                                <p><strong>Cédula/RIF:</strong> ${cliente?.cedula_rif || 'N/A'}</p>
                            </div>
                            <div>
                                <p><strong>Teléfono:</strong> ${cliente?.telefono || 'No especificado'}</p>
                                <p><strong>Dirección:</strong> ${cliente?.direccion || 'No especificada'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="mb-6">
                        <h3 class="font-bold text-gray-800 mb-3 text-sm">DETALLES DE LA VENTA</h3>
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="border border-gray-300 p-2 text-left">Producto</th>
                                    <th class="border border-gray-300 p-2 text-center">Cantidad</th>
                                    <th class="border border-gray-300 p-2 text-center">IVA</th>
                                    <th class="border border-gray-300 p-2 text-right">Precio Unit.</th>
                                    <th class="border border-gray-300 p-2 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(items || []).map(item => {
                                    const cantidad = parseFloat(item.cantidad) || 0;
                                    const precio_unitario = parseFloat(item.precio_unitario) || 0;
                                    
                                    // CORRECCIÓN DE TASA
                                    const tasa_iva = (item.tasa_iva !== null && item.tasa_iva !== undefined) 
                                                     ? parseFloat(item.tasa_iva) 
                                                     : 16;
                                                     
                                    const subtotal = cantidad * precio_unitario;
                                    
                                    return `
                                        <tr>
                                            <td class="border border-gray-300 p-2">${item.producto_nombre || 'N/A'}</td>
                                            <td class="border border-gray-300 p-2 text-center">${cantidad} ${item.unidad_medida || 'unidad'}</td>
                                            <td class="border border-gray-300 p-2 text-center">
                                                ${tasa_iva === 0 ? 
                                                  '<span class="text-green-600 text-xs">EXENTO</span>' : 
                                                  `${tasa_iva}%`}
                                            </td>
                                            <td class="border border-gray-300 p-2 text-right">Bs. ${precio_unitario.toFixed(2)}</td>
                                            <td class="border border-gray-300 p-2 text-right">Bs. ${subtotal.toFixed(2)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="p-4 bg-purple-50 rounded-lg">
                            <h4 class="font-bold text-purple-800 mb-2 text-sm">MÉTODO DE PAGO</h4>
                            <p class="text-purple-700 font-semibold text-sm">${this.formatearMetodoPago(factura.metodo_pago)}</p>
                            ${detalles_pago ? this.mostrarDetallesPagoFormateados(detalles_pago, factura.metodo_pago) : ''}
                        </div>

                        <div class="p-4 bg-gray-50 rounded-lg">
                            <h4 class="font-bold text-gray-800 mb-2 text-sm">RESUMEN</h4>
                            <div class="space-y-1 text-sm">
                                <div class="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>Bs. ${subtotal_bs.toFixed(2)}</span>
                                </div>
                                ${desgloseIvaHTML}
                                <div class="flex justify-between font-bold border-t border-gray-300 pt-1 mt-1">
                                    <span>TOTAL:</span>
                                    <span class="text-purple-600">Bs. ${total_bs.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-8 text-center text-gray-500 text-xs border-t border-gray-300 pt-4">
                        <p><strong>Vendedor:</strong> ${vendedor || 'N/A'}</p>
                        <p>${empresa?.mensaje_factura || '¡Gracias por su compra!'}</p>
                        <p>${empresa?.nombre_empresa || "Pollera Na'Guara"} - Sistema de Venta Rápida</p>
                        <p>Factura reimpresa el ${new Date().toLocaleString('es-ES')}</p>
                    </div>

                    <div class="no-print mt-6 text-center">
                        <button onclick="window.print()" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                            🖨️ Imprimir Factura
                        </button>
                        <button onclick="window.close()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors ml-4">
                            Cerrar Ventana
                        </button>
                    </div>
                </div>
            </body>
            </html>
        `;

        ventanaImpresion.document.write(htmlImpresion);
        ventanaImpresion.document.close();

        setTimeout(() => {
            ventanaImpresion.focus();
        }, 500);
    }

    exportarFacturas() {
        try {
            if (!this.facturasActuales || this.facturasActuales.length === 0) {
                this.mostrarError('No hay facturas para exportar. Primero realice una búsqueda.');
                return;
            }

            console.log('Exportando:', this.facturasActuales.length, 'facturas');

            const wb = XLSX.utils.book_new();
            
            const datosExportar = this.facturasActuales.map(factura => {
                const total = parseFloat(factura.total) || 0;
                const fecha = new Date(factura.fecha_venta);
                
                return {
                    'N° Factura': `F-${factura.id.toString().padStart(6, '0')}`,
                    'Fecha': fecha.toLocaleDateString('es-ES'),
                    'Hora': fecha.toLocaleTimeString('es-ES'),
                    'Cliente': factura.cliente_nombre || 'N/A',
                    'Cédula/RIF': factura.cliente_cedula || 'N/A',
                    'Vendedor': factura.vendedor_nombre || 'N/A',
                    'Método de Pago': this.formatearMetodoPago(factura.metodo_pago),
                    'Estado': factura.estado === 'completada' ? 'Completada' : 'Anulada',
                    'Total ($)': total,
                    'Referencia Pago': factura.referencia_pago || 'N/A',
                    'Banco': factura.banco_pago || 'N/A',
                    'Motivo Anulación': factura.motivo_anulacion || 'N/A'
                };
            });
            
            const ws = XLSX.utils.json_to_sheet(datosExportar);
            XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
            
            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `Facturas_NaGuara_${fecha}.xlsx`;
            
            XLSX.writeFile(wb, nombreArchivo);
            
            this.mostrarExito(`Archivo "${nombreArchivo}" descargado correctamente (${this.facturasActuales.length} facturas)`);

        } catch (error) {
            console.error('Error exportando:', error);
            this.mostrarError('Error al exportar los datos: ' + error.message);
        }
    }

    contarFacturasPorEstado(estado) {
        return this.facturasActuales.filter(factura => factura.estado === estado).length;
    }

    // Utilidades
    formatearMetodoPago(metodo) {
        const metodos = {
            'efectivo': 'Efectivo BS',
            'efectivo_usd': 'Efectivo USD',
            'tarjeta': 'Tarjeta',
            'transferencia': 'Transferencia',
            'pago_movil': 'Pago Móvil',
            'punto_venta': 'Punto de Venta',
            'mixto': 'Mixto'
        };
        return metodos[metodo] || metodo;
    }

    getBadgeClass(metodo) {
        const clases = {
            'efectivo': 'badge-primary',
            'efectivo_usd': 'badge-success',
            'tarjeta': 'badge-info',
            'transferencia': 'badge-warning',
            'pago_movil': 'badge-secondary',
            'punto_venta': 'badge-dark',
            'mixto': 'badge-purple'
        };
        return clases[metodo] || 'badge-primary';
    }

    abrirModal(id) {
        document.getElementById(id).classList.remove('hidden');
    }

    cerrarModal(id) {
        document.getElementById(id).classList.add('hidden');
    }

    mostrarLoading(mostrar) {
        const container = document.getElementById('facturasBody');
        if (mostrar) {
            container.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Cargando facturas...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    getEmptyStateHTML() {
        return `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No se encontraron facturas</p>
                    </div>
                </td>
            </tr>
        `;
    }

    mostrarError(mensaje) {
        alert(`❌ ${mensaje}`);
    }

    mostrarExito(mensaje) {
        alert(`✅ ${mensaje}`);
    }

    mostrarInfo(mensaje) {
        alert(`ℹ️ ${mensaje}`);
    }
}

// Inicializar la aplicación
let facturasManager;

document.addEventListener('DOMContentLoaded', function() {
    facturasManager = new FacturasManager();
});