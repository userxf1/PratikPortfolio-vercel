/*---------------------------------------------
 * Admin Dashboard JavaScript
 * Displays visitor data and analytics
 *--------------------------------------------*/

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // DOM elements
    const totalVisitorsElement = document.getElementById('total-visitors');
    const totalPageViewsElement = document.getElementById('total-page-views');
    const avgSessionTimeElement = document.getElementById('avg-session-time');
    const mobileUsersElement = document.getElementById('mobile-users');
    const visitorsTableBody = document.getElementById('visitors-table-body');
    const browserStatsElement = document.getElementById('browser-stats');
    const pageStatsElement = document.getElementById('page-stats');
    const navItems = document.querySelectorAll('.admin-nav li');
    const adminPanels = document.querySelectorAll('.admin-panel');
    
    // API endpoint
    const API_BASE_URL = '/api';
    
    // Initialize dashboard
    updateStats();
    
    // Set up auto-refresh every 30 seconds
    setInterval(updateStats, 30000);
    
    // Set up navigation
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetId = this.querySelector('a').getAttribute('href').substring(1);
            
            // Update active nav item
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding panel
            adminPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetId) {
                    panel.classList.add('active');
                }
            });
        });
    });
    
    /**
     * Update all statistics on the dashboard
     */
    function updateStats() {
        // Show loading state
        if (totalVisitorsElement) totalVisitorsElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Fetch data from API
        fetch(`${API_BASE_URL}/admin/data`)
            .then(response => response.json())
            .then(data => {
                // Process the data
                const visitors = data.visitors || [];
                const pageViews = data.pageViews || [];
                const sessionDurations = data.sessionDurations || [];
                
                // Update UI with the data
                updateDashboardWithData(visitors, pageViews, sessionDurations);
            })
            .catch(error => {
                console.error('Error fetching admin data:', error);
                
                // Fallback to localStorage data if API fails
                const visitors = JSON.parse(localStorage.getItem('portfolio_visitors')) || [];
                const pageViews = JSON.parse(localStorage.getItem('portfolio_pageviews')) || [];
                const sessionDurations = JSON.parse(localStorage.getItem('portfolio_sessionDurations')) || [];
                
                // Update UI with localStorage data
                updateDashboardWithData(visitors, pageViews, sessionDurations);
            });
    }
    
    /**
     * Update dashboard with the provided data
     */
    function updateDashboardWithData(visitors, pageViews, sessionDurations) {
        
        // Update summary stats
        updateSummaryStats(visitors, pageViews, sessionDurations);
        
        // Populate visitors table
        populateVisitorsTable(visitors);
        
        // Initialize charts
        initCharts(visitors, pageViews, sessionDurations);
        
        // Update browser and page stats
        updateBrowserStats(visitors);
        updatePageStats(pageViews);
    }
    
    /**
     * Update the summary statistics at the top of the dashboard
     */
    function updateSummaryStats(visitors, pageViews, sessionDurations) {
        // Total visitors
        totalVisitorsElement.textContent = visitors.length;
        
        // Total page views
        totalPageViewsElement.textContent = pageViews.length;
        
        // Average session time
        const avgSessionTime = sessionDurations.length > 0 
            ? Math.round(sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length)
            : 0;
        avgSessionTimeElement.textContent = formatTime(avgSessionTime);
        
        // Mobile users percentage
        const mobileCount = visitors.filter(visitor => visitor.device === 'Mobile').length;
        const mobilePercentage = visitors.length > 0 
            ? Math.round((mobileCount / visitors.length) * 100) 
            : 0;
        mobileUsersElement.textContent = `${mobilePercentage}%`;
    }
    
    /**
     * Populate the visitors table with data
     */
    function populateVisitorsTable(visitors) {
        // Clear existing table content
        visitorsTableBody.innerHTML = '';
        
        // Sort visitors by timestamp (most recent first)
        const sortedVisitors = [...visitors].sort((a, b) => b.timestamp - a.timestamp);
        
        // Add each visitor to the table
        sortedVisitors.forEach(visitor => {
            const row = document.createElement('tr');
            
            // Create visitor ID cell (shortened for display)
            const idCell = document.createElement('td');
            idCell.textContent = visitor.id.substring(0, 8) + '...';
            
            // Create date cell
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(new Date(visitor.timestamp));
            
            // Create visits cell
            const visitsCell = document.createElement('td');
            visitsCell.textContent = visitor.visits;
            
            // Create browser cell
            const browserCell = document.createElement('td');
            browserCell.textContent = visitor.browser || 'Unknown';
            
            // Create device cell
            const deviceCell = document.createElement('td');
            deviceCell.textContent = visitor.device || 'Unknown';
            
            // Create screen size cell
            const screenCell = document.createElement('td');
            screenCell.textContent = visitor.screenSize || 'Unknown';
            
            // Add cells to row
            row.appendChild(idCell);
            row.appendChild(dateCell);
            row.appendChild(visitsCell);
            row.appendChild(browserCell);
            row.appendChild(deviceCell);
            row.appendChild(screenCell);
            
            // Add row to table
            visitorsTableBody.appendChild(row);
        });
    }
    
    /**
     * Format a date object to a readable string
     */
    function formatDate(date) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Format time in seconds to a readable string
     */
    function formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }
    
    /**
     * Initialize all charts
     */
    function initCharts(visitors, pageViews, sessionDurations) {
        initDeviceChart(visitors);
        initSessionChart(sessionDurations);
    }
    
    /**
     * Initialize device distribution chart
     */
    function initDeviceChart(visitors) {
        const deviceChartCanvas = document.getElementById('device-chart');
        
        // Count devices
        const deviceCounts = {
            'Desktop': 0,
            'Mobile': 0,
            'Tablet': 0
        };
        
        visitors.forEach(visitor => {
            const device = visitor.device || 'Unknown';
            deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        });
        
        // Create chart
        if (deviceChartCanvas) {
            const ctx = deviceChartCanvas.getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(deviceCounts),
                    datasets: [{
                        data: Object.values(deviceCounts),
                        backgroundColor: [
                            '#9D4EDD',
                            '#5A189A',
                            '#3C096C'
                        ],
                        borderColor: '#121212',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#CCCCCC',
                                padding: 15
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Initialize session duration chart
     */
    function initSessionChart(sessionDurations) {
        const sessionChartCanvas = document.getElementById('session-chart');
        
        // Group session durations into buckets
        const durationBuckets = {
            '< 1 min': 0,
            '1-3 min': 0,
            '3-5 min': 0,
            '5-10 min': 0,
            '> 10 min': 0
        };
        
        sessionDurations.forEach(duration => {
            if (duration < 60) {
                durationBuckets['< 1 min']++;
            } else if (duration < 180) {
                durationBuckets['1-3 min']++;
            } else if (duration < 300) {
                durationBuckets['3-5 min']++;
            } else if (duration < 600) {
                durationBuckets['5-10 min']++;
            } else {
                durationBuckets['> 10 min']++;
            }
        });
        
        // Create chart
        if (sessionChartCanvas) {
            const ctx = sessionChartCanvas.getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(durationBuckets),
                    datasets: [{
                        label: 'Number of Sessions',
                        data: Object.values(durationBuckets),
                        backgroundColor: '#9D4EDD',
                        borderColor: '#5A189A',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#CCCCCC'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#CCCCCC'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#CCCCCC'
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Update browser distribution stats
     */
    function updateBrowserStats(visitors) {
        // Count browsers
        const browserCounts = {};
        
        visitors.forEach(visitor => {
            const browser = visitor.browser || 'Unknown';
            browserCounts[browser] = (browserCounts[browser] || 0) + 1;
        });
        
        // Sort browsers by count (descending)
        const sortedBrowsers = Object.entries(browserCounts)
            .sort((a, b) => b[1] - a[1]);
        
        // Clear existing content
        browserStatsElement.innerHTML = '';
        
        // Create browser stat items
        sortedBrowsers.forEach(([browser, count]) => {
            const percentage = visitors.length > 0 
                ? Math.round((count / visitors.length) * 100) 
                : 0;
            
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            
            // Browser icon based on name
            let iconClass = 'fas fa-globe';
            if (browser === 'Chrome') iconClass = 'fab fa-chrome';
            else if (browser === 'Firefox') iconClass = 'fab fa-firefox';
            else if (browser === 'Safari') iconClass = 'fab fa-safari';
            else if (browser === 'Edge') iconClass = 'fab fa-edge';
            else if (browser === 'Opera') iconClass = 'fab fa-opera';
            else if (browser === 'Internet Explorer') iconClass = 'fab fa-internet-explorer';
            
            statItem.innerHTML = `
                <div class="stat-name">
                    <i class="${iconClass}"></i>
                    ${browser}
                </div>
                <div class="stat-value">${percentage}%</div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${percentage}%"></div>
                </div>
            `;
            
            browserStatsElement.appendChild(statItem);
        });
    }
    
    /**
     * Update page popularity stats
     */
    function updatePageStats(pageViews) {
        // Count page views by path
        const pageCounts = {};
        
        pageViews.forEach(view => {
            const page = view.page || '/';
            pageCounts[page] = (pageCounts[page] || 0) + 1;
        });
        
        // Sort pages by count (descending)
        const sortedPages = Object.entries(pageCounts)
            .sort((a, b) => b[1] - a[1]);
        
        // Clear existing content
        pageStatsElement.innerHTML = '';
        
        // Create page stat items
        sortedPages.forEach(([page, count]) => {
            const percentage = pageViews.length > 0 
                ? Math.round((count / pageViews.length) * 100) 
                : 0;
            
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            
            // Get page name from path
            let pageName = page === '/' ? 'Home' : page.split('/').pop().split('.')[0];
            pageName = pageName.charAt(0).toUpperCase() + pageName.slice(1); // Capitalize
            
            statItem.innerHTML = `
                <div class="stat-name">
                    <i class="fas fa-file"></i>
                    ${pageName}
                </div>
                <div class="stat-value">${count} views</div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${percentage}%"></div>
                </div>
            `;
            
            pageStatsElement.appendChild(statItem);
        });
    }
});
