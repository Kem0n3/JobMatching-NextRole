// public/js/dashboardCharts.js
document.addEventListener('DOMContentLoaded', function() {
    const chartDataElement = document.getElementById('applicationStatusChartData');
    let applicationStatusCountsFromEJS = {}; 

    if (chartDataElement) {
        try {
            applicationStatusCountsFromEJS = JSON.parse(chartDataElement.textContent);
        } catch (e) {
            console.error("Error parsing chart data from EJS:", e);
        }
    } else {
        console.warn("Chart data element 'applicationStatusChartData' not found.");
    }

    const applicationChartCtx = document.getElementById('applicationStatusChart');
    if (applicationChartCtx && applicationStatusCountsFromEJS && Object.keys(applicationStatusCountsFromEJS).length > 0) {
        const labels = [];
        const data = [];
        const backgroundColors = [];

        const statusOrder = ['Applied', 'Viewed', 'Under Review', 'Interviewing', 'Offered', 'Hired', 'Rejected', 'Withdrawn'];

        statusOrder.forEach(statusKey => {
            if (applicationStatusCountsFromEJS[statusKey]) {
                labels.push(applicationStatusCountsFromEJS[statusKey].label || statusKey);
                data.push(applicationStatusCountsFromEJS[statusKey].count);
                backgroundColors.push(applicationStatusCountsFromEJS[statusKey].color || '#CFD8DC');
            }
        });

        if (labels.length > 0) {
            new Chart(applicationChartCtx, {
                type: 'doughnut', 
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Application Statuses',
                        data: data,
                        backgroundColor: backgroundColors, 
                        borderColor: '#FFFFFF', 
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: {
                                    family: "'Inter', sans-serif", 
                                    size: 13
                                },
                                color: '#394867' 
                            }
                        },
                        title: {
                            display: false,
                        },
                        tooltip: {
                            callbacks: {  }
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    }
                }
            });
        } else {
             const chartContainer = document.querySelector('.application-tracker .chart-container');
             if(chartContainer) chartContainer.innerHTML = '<p style="text-align:center; padding-top:50px;">No application data for chart.</p>';
        }

    } else if (applicationChartCtx) { 
        const chartContainer = document.querySelector('.application-tracker .chart-container');
        if(chartContainer) chartContainer.innerHTML = '<p style="text-align:center; padding-top:50px;">No application data available for chart.</p>';
    }
});