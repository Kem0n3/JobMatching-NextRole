document.addEventListener('DOMContentLoaded', function() {
    // --- Seeker Application Tracker Chart (Doughnut) ---
    const seekerChartDataElement = document.getElementById('applicationStatusChartData');
    if (seekerChartDataElement) {
        try {
            const applicationStatusCounts = JSON.parse(seekerChartDataElement.textContent);
            const chartLabels = [];
            const chartDataPoints = [];
            const chartBackgroundColors = [];
            const statusOrder = ['Applied', 'Viewed', 'Under Review', 'Interviewing', 'Offered', 'Hired', 'Rejected', 'Withdrawn'];

            statusOrder.forEach(statusKey => {
                if (applicationStatusCounts[statusKey]) {
                    chartLabels.push(applicationStatusCounts[statusKey].label || statusKey);
                    chartDataPoints.push(applicationStatusCounts[statusKey].count);
                    chartBackgroundColors.push(applicationStatusCounts[statusKey].color || '#cccccc');
                }
            });

            if (chartLabels.length > 0) {
                const ctx = document.getElementById('applicationStatusChart').getContext('2d');
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            label: 'Application Statuses',
                            data: chartDataPoints,
                            backgroundColor: chartBackgroundColors,
                            borderColor: '#FFFFFF',
                            borderWidth: 2,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { padding: 15, font: { family: "'Inter', sans-serif" } } },
                            title: { display: false }
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Error initializing seeker chart:", e);
        }
    }

    // --- Recruiter Applicants Over Time Chart (Line) ---
    const recruiterChartDataElement = document.getElementById('recruiterChartData');
    if (recruiterChartDataElement) {
        try {
            const chartData = JSON.parse(recruiterChartDataElement.textContent);
            if (chartData.labels && chartData.labels.length > 0) {
                const ctx = document.getElementById('applicantsOverTimeChart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: 'New Applicants',
                            data: chartData.data,
                            fill: true,
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            borderColor: 'rgba(37, 99, 235, 1)',
                            tension: 0.3,
                            pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                            pointBorderColor: '#fff',
                            pointHoverRadius: 6,
                            pointRadius: 4,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Error initializing recruiter chart:", e);
        }
    }
});