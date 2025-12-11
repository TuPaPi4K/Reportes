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
            this.switchReportType(reportType);
        } else {
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
        const stat1 = document.getElementById('stat-1');
        const stat2 = document.getElementById('stat-2');
        const stat3 = document.getElementById('stat-3');
        const labels = document.querySelectorAll('.stats-label');
        
        const card3 = stat3 ? stat3.closest('.stats-card') : null;
        
        if (card3) {
            card3.classList.remove('hidden');
            card3.style.borderLeft = ''; 
        }

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
            labels[2].textContent = 'Valor del Inventario';
            
            stat1.textContent = stats.total.toLocaleString('es-VE', {maximumFractionDigits: 2});
            stat2.textContent = stats.count;
            stat3.textContent = `Bs. ${stats.average.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            
            if (card3) card3.style.borderLeft = '4px solid #2ecc71'; 

        } else { // Stock Mínimo
            labels[0].textContent = 'Total de Productos';
            labels[1].textContent = 'Productos Críticos';
            labels[2].textContent = 'Estado General';
            
            stat1.textContent = stats.total;
            stat2.textContent = stats.count;
            stat3.textContent = stats.average;
            
            if (card3) {
                if (stats.average === 'Crítico') card3.style.borderLeft = '4px solid #ef4444';
                else if (stats.average === 'Bajo') card3.style.borderLeft = '4px solid #f59e0b';
                else card3.style.borderLeft = '4px solid #10b981';
            }
        }
    }

    renderChart(chartData, type) {
        const ctx = document.getElementById('main-chart').getContext('2d');
        if (this.currentChart) this.currentChart.destroy();

        // Tipos de gráfico
        let chartType = (type === 'ventas') ? 'line' : 'bar';
        if (type === 'inventario') chartType = 'doughnut';

        // Fix visual: Si hay 1 solo dato en ventas, usar barra
        if (type === 'ventas' && chartData.data.length === 1) {
            chartType = 'bar';
        }

        // Configuración de Colores
        let mainColor = '#5a00b3'; // Morado (Ventas)
        let bgColor = 'rgba(90, 0, 179, 0.2)'; // Relleno suave

        if (type === 'compras') {
            mainColor = '#5a00b3'; // Rojo (Compras)
            bgColor = 'rgba(90, 0, 179, 0.2)'; // Barra roja sólida
        } else if (chartType === 'bar' && type !== 'compras') {
            bgColor = 'rgba(90, 0, 179, 0.7)';
        }

        const doughnutColors = ['#5a00b3', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

        this.currentChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: (type === 'ventas' || type === 'compras') ? 'Monto (Bs)' : 'Cantidad',
                    data: chartData.data,
                    backgroundColor: (chartType === 'doughnut') ? doughnutColors : bgColor,
                    borderColor: mainColor,
                    
                    borderWidth: (chartType === 'doughnut') ? 0 : 2,
                    hoverOffset: (chartType === 'doughnut') ? 20 : 0,

                    tension: 0.4,
                    fill: type === 'ventas',
                    pointRadius: 6,
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
            const amountColor = (type === 'ventas') ? 'text-green-600' : 'text-red-600';
            headersRow.innerHTML = `<th>Fecha</th><th>Transacciones</th><th>Monto Total</th>`;
            data.forEach(row => {
                body.innerHTML += `<tr class="hover:bg-gray-50">
                    <td class="p-3 border-b">${row.fecha}</td>
                    <td class="p-3 border-b">${row.transacciones}</td> 
                    <td class="p-3 border-b font-bold ${amountColor}">Bs. ${row.total.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                </tr>`;
            });
        } else if (type === 'inventario') {
            // [MODIFICACIÓN] Ahora con columna TOTAL
            headersRow.innerHTML = `<th>Producto</th><th>Stock</th><th>Costo Unit.</th><th>Total</th>`;
            data.forEach(row => {
                body.innerHTML += `<tr class="hover:bg-gray-50">
                    <td class="p-3 border-b">${row.nombre}</td>
                    <td class="p-3 border-b font-bold text-gray-800">${row.stock} ${row.unidad_medida || ''}</td>
                    <td class="p-3 border-b text-gray-600">Bs. ${parseFloat(row.costo_compra || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                    <td class="p-3 border-b font-bold text-green-600">Bs. ${parseFloat(row.valor_total || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                </tr>`;
            });
        } else {
            // Stock Mínimo
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
        
        let head = [];
        let body = [];

        if (this.currentReportType === 'ventas' || this.currentReportType === 'compras') {
            head = [['Fecha', 'Transacciones', 'Monto Total']];
            body = this.currentTableData.map(row => [
                row.fecha, 
                row.transacciones, 
                `Bs. ${row.total.toFixed(2)}`
            ]);
        } else if (this.currentReportType === 'inventario') {
            // [MODIFICACIÓN] PDF de Inventario con Total
            head = [['Producto', 'Stock', 'Costo Unit.', 'Total']];
            body = this.currentTableData.map(row => [
                row.nombre, 
                `${row.stock} ${row.unidad_medida || ''}`, 
                `Bs. ${parseFloat(row.costo_compra || 0).toFixed(2)}`,
                `Bs. ${parseFloat(row.valor_total || 0).toFixed(2)}`
            ]);
        } else {
            // Stock Mínimo
            head = [['Producto', 'Stock', 'Estado']];
            body = this.currentTableData.map(row => [
                row.producto || row.nombre, 
                row.stock, 
                row.estado
            ]);
        }
        
        doc.autoTable({ head: head, body: body, startY: 30 });
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