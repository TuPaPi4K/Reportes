class ReportesManager {
    constructor() {
        this.currentChart = null;
        this.currentReportType = 'ventas';
        this.currentPeriod = 'diario';
        this.apiBase = '/api/reportes';
        this.currentTableData = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDates();
        
        // LEER PARÁMETRO DE LA URL
        const urlParams = new URLSearchParams(window.location.search);
        const reportType = urlParams.get('reporte');
        
        if (reportType && ['ventas', 'compras', 'inventario'].includes(reportType)) {
            // Si viene un reporte en la URL, cargamos ese
            this.switchReportType(reportType);
        } else {
            // Si no, cargamos ventas por defecto
            this.loadReport('ventas');
        }
    }

    setupEventListeners() {
        document.querySelectorAll('[data-report]').forEach(btn => 
            btn.addEventListener('click', (e) => this.switchReportType(e.currentTarget.dataset.report)));
        
        document.querySelectorAll('[data-period]').forEach(btn => 
            btn.addEventListener('click', (e) => this.switchPeriod(e.currentTarget.dataset.period)));

        document.getElementById('view-chart').addEventListener('click', () => this.switchView('chart'));
        document.getElementById('view-table').addEventListener('click', () => this.switchView('table'));


        document.getElementById('apply-filters').addEventListener('click', () => {

            document.querySelectorAll('[data-period]').forEach(btn => btn.classList.remove('active'));
            
            this.loadReport(this.currentReportType);
        });

        document.getElementById('clear-filters').addEventListener('click', () => { 
            this.setDefaultDates(); 
            this.loadReport(this.currentReportType); 
        });

        document.getElementById('generate-report').addEventListener('click', () => this.loadReport(this.currentReportType));
        document.getElementById('export-pdf').addEventListener('click', () => this.exportToPDF());
        document.getElementById('export-excel').addEventListener('click', () => this.exportToExcel());
    }

    setDefaultDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('date-from').value = firstDay.toISOString().split('T')[0];
        document.getElementById('date-to').value = today.toISOString().split('T')[0];
    }

    switchReportType(type) {
        this.currentReportType = type;
        document.querySelectorAll('[data-report]').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-report="${type}"]`).classList.add('active');
        
        const titles = { ventas: 'Reporte de Ventas', compras: 'Reporte de Compras', inventario: 'Reporte de Inventario', stockMinimo: 'Stock Mínimo' };
        document.getElementById('chart-title').innerHTML = `<i class="fas fa-chart-line mr-2"></i>${titles[type]}`;
        
        document.getElementById('period-selector').style.display = (type === 'ventas' || type === 'compras') ? 'block' : 'none';
        this.loadReport(type);
    }

    switchPeriod(period) {
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';

        this.currentPeriod = period;
        document.querySelectorAll('[data-period]').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        
        this.loadReport(this.currentReportType);
    }

    switchView(view) {
        const chart = document.getElementById('chart-section');
        const table = document.getElementById('table-section');
        const chartBtn = document.getElementById('view-chart');
        const tableBtn = document.getElementById('view-table');

        chartBtn.classList.toggle('active', view === 'chart');
        tableBtn.classList.toggle('active', view === 'table');
        
        chart.classList.toggle('hidden', view !== 'chart');
        table.classList.toggle('hidden', view !== 'table');
    }

    async loadReport(type) {
        this.showLoading(true);
        try {
            const params = new URLSearchParams({
                periodo: this.currentPeriod,
                fecha_inicio: document.getElementById('date-from').value,
                fecha_fin: document.getElementById('date-to').value
            });

            const endpointSuffix = type === 'stockMinimo' ? 'stock-minimo' : type;
            const response = await fetch(`${this.apiBase}/${endpointSuffix}?${params}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Error cargando datos');
            
            const data = await response.json();
            this.currentTableData = data.tableData || [];
            
            this.updateStats(data.stats, type);
            this.renderChart(data.chartData, type);
            this.renderTable(data.tableData, type);
            
            const hasData = this.currentTableData.length > 0;
            
            document.getElementById('visualization-panel').classList.remove('hidden');
            
            if (hasData) {
                document.getElementById('empty-state').classList.add('hidden');
                
                const currentView = document.getElementById('view-chart').classList.contains('active') ? 'chart' : 'table';
                this.switchView(currentView);
            } else {
                document.getElementById('empty-state').classList.remove('hidden');
                document.getElementById('chart-section').classList.add('hidden');
                document.getElementById('table-section').classList.add('hidden');
            }

        } catch (error) {
            console.error(error);
        } finally {
            this.showLoading(false);
        }
    }

    updateStats(stats, type) {
        // 1. Obtener referencias a los elementos del DOM
        const stat1 = document.getElementById('stat-1');
        const stat2 = document.getElementById('stat-2');
        const stat3 = document.getElementById('stat-3');
        const labels = document.querySelectorAll('.stats-label');
        
        // 2. Definir card3 (IMPORTANTE para que no dé error)
        // Buscamos el contenedor padre con la clase .stats-card
        const card3 = stat3 ? stat3.closest('.stats-card') : null;
        
        // 3. Resetear visibilidad y estilos por defecto
        if (card3) {
            card3.classList.remove('hidden');
            card3.style.borderLeft = ''; // Limpiar colores anteriores
        }

        // 4. Lógica según el tipo de reporte
        if (type === 'ventas' || type === 'compras') {
            labels[0].textContent = type === 'ventas' ? 'Ingresos Totales' : 'Gastos Totales';
            labels[1].textContent = type === 'ventas' ? 'Transacciones' : 'Compras Realizadas';
            labels[2].textContent = 'Ticket Promedio';
            
            stat1.textContent = `Bs. ${stats.total.toLocaleString('es-VE', {minimumFractionDigits: 2})}`;
            stat2.textContent = stats.count;
            stat3.textContent = `Bs. ${stats.average.toLocaleString('es-VE', {minimumFractionDigits: 2})}`;

        } else if (type === 'inventario') {
            labels[0].textContent = 'Stock Total (Unid/Kg)';
            labels[1].textContent = 'Referencias Únicas';
            labels[2].textContent = ''; // Limpiar etiqueta
            
            stat1.textContent = stats.total.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            stat2.textContent = stats.count;
            stat3.textContent = '';
            
            // Ocultar la tarjeta 3 en inventario
            if (card3) card3.classList.add('hidden');

        } else { // Reporte de Stock Mínimo
            labels[0].textContent = 'Total de Productos';
            labels[1].textContent = 'Productos Críticos';
            labels[2].textContent = 'Estado General';
            
            stat1.textContent = stats.total;
            stat2.textContent = stats.count;
            stat3.textContent = stats.average;
            
            // Aplicar colores semánticos al borde de la tarjeta 3
            if (card3) {
                if (stats.average === 'Crítico') {
                    card3.style.borderLeft = '4px solid #ef4444'; // Rojo
                } else if (stats.average === 'Bajo') {
                    card3.style.borderLeft = '4px solid #f59e0b'; // Amarillo
                } else {
                    card3.style.borderLeft = '4px solid #10b981'; // Verde
                }
            }
        }
    }

    renderChart(chartData, type) {
        const ctx = document.getElementById('main-chart').getContext('2d');
        if (this.currentChart) this.currentChart.destroy();

        let chartType = (type === 'ventas') ? 'line' : 'bar';
        if (type === 'inventario') chartType = 'doughnut'; // Stock Mínimo usa gráfico aparte en index.html, aquí es inventario

        // 🔧 FIX VISUAL: Si hay un solo dato (ej: un solo día o un solo mes),
        // forzamos el tipo 'bar' (barra) porque una línea de un solo punto no se ve.
        if ((type === 'ventas' || type === 'compras') && chartData.data.length === 1) {
            chartType = 'bar';
        }

        const colors = ['#5a00b3', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

        this.currentChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: (type === 'ventas' || type === 'compras') ? 'Monto (Bs)' : 'Cantidad',
                    data: chartData.data,
                    // Ajuste de colores dinámico según el tipo de gráfico
                    backgroundColor: (chartType === 'doughnut') ? colors : (chartType === 'bar' ? 'rgba(90, 0, 179, 0.7)' : 'rgba(90, 0, 179, 0.2)'),
                    borderColor: '#5a00b3',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: type === 'ventas' && chartType === 'line', // Solo rellenar si es línea de ventas
                    pointRadius: 6, // Puntos más visibles
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: chartType === 'doughnut' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: (chartType === 'doughnut') ? {} : {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [2, 4] }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    renderTable(data, type) {
        const headersRow = document.getElementById('table-headers');
        const body = document.getElementById('table-body');
        body.innerHTML = '';

        if (type === 'ventas' || type === 'compras') {
            headersRow.innerHTML = `<th>Fecha</th><th>Transacciones</th><th>Monto Total</th>`;
            data.forEach(row => {
                body.innerHTML += `<tr class="hover:bg-gray-50">
                    <td class="p-3 border-b">${row.fecha}</td>
                    <td class="p-3 border-b">${row.transacciones}</td> <td class="p-3 border-b font-bold text-green-600">Bs. ${row.total.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                </tr>`;
            });
        } else {
            headersRow.innerHTML = `<th>Producto</th><th>Stock</th><th>Estado</th>`;
            data.forEach(row => {
                const estado = row.stock <= 0 ? 'Agotado' : (row.minimo && row.stock <= row.minimo ? 'Crítico' : 'Normal');
                const color = row.stock <= 0 ? 'text-red-600' : 'text-gray-800';
                body.innerHTML += `<tr class="hover:bg-gray-50">
                    <td class="p-3 border-b">${row.producto || row.nombre}</td>
                    <td class="p-3 border-b font-bold ${color}">${row.stock}</td>
                    <td class="p-3 border-b">${estado}</td>
                </tr>`;
            });
        }
    }

    showLoading(isLoading) {
        document.getElementById('loading-state').classList.toggle('hidden', !isLoading);
        document.getElementById('chart-section').classList.toggle('hidden', isLoading);
        document.getElementById('table-section').classList.toggle('hidden', isLoading);
    }

    exportToPDF() {
        if (!this.currentTableData.length) return alert('No hay datos');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(`REPORTE DE ${this.currentReportType.toUpperCase()}`, 14, 20);
        
        const body = this.currentTableData.map(row => {
            if (this.currentReportType === 'ventas' || this.currentReportType === 'compras') {
                return [row.fecha, row.transacciones, `Bs. ${row.total.toFixed(2)}`];
            }
            return [row.producto || row.nombre, row.stock, row.estado || ''];
        });
        
        doc.autoTable({ head: [['Columna 1', 'Columna 2', 'Columna 3']], body: body, startY: 30 });
        doc.save(`reporte_${this.currentReportType}.pdf`);
    }

    exportToExcel() {
        if (!this.currentTableData.length) return alert('No hay datos');
        const ws = XLSX.utils.json_to_sheet(this.currentTableData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, `reporte_${this.currentReportType}.xlsx`);
    }
}

document.addEventListener('DOMContentLoaded', () => new ReportesManager());