document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // DOM elements
    const totalVisitorsElement = document.getElementById('total-visitors');
    const totalPageViewsElement = document.getElementById('total-page-views');
    const mobileUsersElement = document.getElementById('mobile-users');
    const pcUsersElement = document.getElementById('pc-users');
    const visitorsTableBody = document.getElementById('visitors-table-body');
    const contactLogsTableBody = document.getElementById('contact-logs-table-body');
    const browserStatsElement = document.getElementById('browser-stats');
    const pageStatsElement = document.getElementById('page-stats');
    const navItems = document.querySelectorAll('.admin-nav li');
    const adminPanels = document.querySelectorAll('.admin-panel');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    
    // API endpoint
    const API_BASE_URL = '/api';
    
    // Initialize dashboard
    updateStats();
    
    // Set up auto-refresh every 30 seconds
    setInterval(updateStats, 30000);
    
    // Set up navigation
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.querySelector('a').getAttribute('href').substring(1);
            adminPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetId) {
                    panel.classList.add('active');
                }
            });
        });
    });
    
    // Mobile sidebar toggle
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    /**
     * Update all statistics on the dashboard
     */
    async function updateStats() {
        // Show loading state
        if (totalVisitorsElement) totalVisitorsElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (totalPageViewsElement) totalPageViewsElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (mobileUsersElement) mobileUsersElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (pcUsersElement) pcUsersElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (visitorsTableBody) visitorsTableBody.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
        if (contactLogsTableBody) contactLogsTableBody.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
        if (browserStatsElement) browserStatsElement.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
        if (pageStatsElement) pageStatsElement.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

        // Fetch all stats concurrently with individual error handling
        const endpoints = [
            { url: `${API_BASE_URL}/admin/total-visitors`, key: 'totalVisitors', default: { count: 0 } },
            { url: `${API_BASE_URL}/admin/total-page-views`, key: 'totalPageViews', default: { count: 0 } },
            { url: `${API_BASE_URL}/admin/mobile-users`, key: 'mobileUsers', default: { percentage: 0 } },
            { url: `${API_BASE_URL}/admin/pc-users`, key: 'pcUsers', default: { percentage: 0 } },
            { url: `${API_BASE_URL}/admin/recent-visitors`, key: 'recentVisitors', default: [] },
            { url: `${API_BASE_URL}/admin/browser-stats`, key: 'browserStats', default: [] },
            { url: `${API_BASE_URL}/admin/page-stats`, key: 'pageStats', default: [] },
            { url: `${API_BASE_URL}/admin/device-stats`, key: 'deviceStats', default: [] },
            { url: `${API_BASE_URL}/admin/session-buckets`, key: 'sessionBuckets', default: [] },
            { url: `${API_BASE_URL}/admin/contact-logs`, key: 'contactLogs', default: [] }
        ];

        const results = {};
        const fetchPromises = endpoints.map(async ({ url, key, default: defaultValue }) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
                const data = await response.json();
                results[key] = data || defaultValue;
            } catch (error) {
                console.error(`Error fetching ${url}:`, error);
                results[key] = defaultValue;
            }
        });

        await Promise.all(fetchPromises);

        // Fallback to localStorage if all API calls fail
        if (Object.values(results).every(result => result === null || (Array.isArray(result) && result.length === 0))) {
            console.warn('All API calls failed, falling back to localStorage');
            const visitors = JSON.parse(localStorage.getItem('portfolio_visitors')) || [];
            const pageViews = JSON.parse(localStorage.getItem('portfolio_pageviews')) || [];
            const sessionDurations = JSON.parse(localStorage.getItem('portfolio_sessionDurations')) || [];
            const contactLogs = JSON.parse(localStorage.getItem('portfolio_contact_logs')) || [];
            results.totalVisitors = { count: visitors.length };
            results.totalPageViews = { count: pageViews.length };
            results.mobileUsers = { percentage: visitors.length > 0 ? Math.round((visitors.filter(v => v.device === 'Mobile').length / visitors.length) * 100) : 0 };
            results.pcUsers = { percentage: visitors.length > 0 ? Math.round((visitors.filter(v => v.device === 'Desktop').length / visitors.length) * 100) : 0 };
            results.recentVisitors = visitors;
            results.browserStats = computeBrowserStats(visitors);
            results.pageStats = computePageStats(pageViews);
            results.deviceStats = computeDeviceStats(visitors);
            results.sessionBuckets = computeSessionBuckets(sessionDurations);
            results.contactLogs = contactLogs;
        }

        // Update UI with the data
        updateDashboardWithData(
            results.totalVisitors.count || 0,
            results.totalPageViews.count || 0,
            results.mobileUsers.percentage || 0,
            results.pcUsers.percentage || 0,
            results.recentVisitors || [],
            results.browserStats || [],
            results.pageStats || [],
            results.deviceStats || [],
            results.sessionBuckets || [],
            results.contactLogs || []
        );
    }
    
    /**
     * Update dashboard with the provided data
     */
    function updateDashboardWithData(totalVisitors, totalPageViews, mobilePercentage, pcPercentage, visitors, browserStats, pageStats, deviceStats, sessionBuckets, contactLogs) {
        // Update summary stats with pulse animation
        if (totalVisitorsElement) {
            totalVisitorsElement.textContent = totalVisitors || 'N/A';
            totalVisitorsElement.closest('.stats-card').classList.add('pulse');
            setTimeout(() => totalVisitorsElement.closest('.stats-card').classList.remove('pulse'), 1000);
        }
        
        if (totalPageViewsElement) {
            totalPageViewsElement.textContent = totalPageViews || 'N/A';
            totalPageViewsElement.closest('.stats-card').classList.add('pulse');
            setTimeout(() => totalPageViewsElement.closest('.stats-card').classList.remove('pulse'), 1000);
        }
        
        if (mobileUsersElement) {
            mobileUsersElement.textContent = mobilePercentage ? `${mobilePercentage}%` : 'N/A';
            mobileUsersElement.closest('.stats-card').classList.add('pulse');
            setTimeout(() => mobileUsersElement.closest('.stats-card').classList.remove('pulse'), 1000);
        }
        
        if (pcUsersElement) {
            pcUsersElement.textContent = pcPercentage ? `${pcPercentage}%` : 'N/A';
            pcUsersElement.closest('.stats-card').classList.add('pulse');
            setTimeout(() => pcUsersElement.closest('.stats-card').classList.remove('pulse'), 1000);
        }

        // Populate tables
        populateVisitorsTable(visitors);
        populateContactLogsTable(contactLogs);
        
        // Update browser and page stats
        updateBrowserStats(browserStats);
        updatePageStats(pageStats);
        
        // Initialize charts
        initCharts(deviceStats, sessionBuckets);
    }
    
    /**
     * Format a date object to a readable string
     */
    function formatDate(date) {
        if (!date || isNaN(new Date(date).getTime())) return 'N/A';
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleDateString('en-US', options);
    }
    
    /**
     * Initialize all charts
     */
    function initCharts(deviceStats, sessionBuckets) {
        initDeviceChart(deviceStats);
        initSessionChart(sessionBuckets);
    }
    
    /**
     * Initialize device distribution chart
     */
    function initDeviceChart(deviceStats) {
        const deviceChartCanvas = document.getElementById('device-chart');
        if (deviceChartCanvas) {
            const ctx = deviceChartCanvas.getContext('2d');
            if (!deviceStats || deviceStats.length === 0) {
                deviceChartCanvas.parentElement.innerHTML = '<p>No device data available</p>';
                return;
            }
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: deviceStats.map(stat => stat.device || 'Unknown'),
                    datasets: [{
                        data: deviceStats.map(stat => stat.count || 0),
                        backgroundColor: ['#9D4EDD', '#C4A1FF', '#5A189A'],
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
                            labels: { color: '#CCCCCC', padding: 15 }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Initialize session duration chart
     */
    function initSessionChart(sessionBuckets) {
        const sessionChartCanvas = document.getElementById('session-chart');
        if (sessionChartCanvas) {
            const ctx = sessionChartCanvas.getContext('2d');
            if (!sessionBuckets || sessionBuckets.length === 0) {
                sessionChartCanvas.parentElement.innerHTML = '<p>No session data available</p>';
                return;
            }
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sessionBuckets.map(stat => stat.bucket || 'Unknown'),
                    datasets: [{
                        label: 'Number of Sessions',
                        data: sessionBuckets.map(stat => stat.count || 0),
                        backgroundColor: '#9D4EDD',
                        borderColor: '#5A189A',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#CCCCCC' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        x: { ticks: { color: '#CCCCCC' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                    },
                    plugins: { legend: { labels: { color: '#CCCCCC' } } }
                }
            });
        }
    }
    
    /**
     * Populate the visitors table with data
     */
    function populateVisitorsTable(visitors) {
        if (!visitorsTableBody) return;
        visitorsTableBody.innerHTML = '';
        
        if (!visitors || visitors.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.textContent = 'No visitor data available';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            visitorsTableBody.appendChild(row);
            return;
        }
        
        const sortedVisitors = [...visitors].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        sortedVisitors.forEach(visitor => {
            const row = document.createElement('tr');
            
            const idCell = document.createElement('td');
            idCell.textContent = visitor.id ? visitor.id.substring(0, 8) + '...' : 'N/A';
            
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(visitor.timestamp);
            
            const visitsCell = document.createElement('td');
            visitsCell.textContent = visitor.visits || 'N/A';
            
            const browserCell = document.createElement('td');
            browserCell.textContent = visitor.browser || 'Unknown';
            
            const deviceCell = document.createElement('td');
            deviceCell.textContent = visitor.device || 'Unknown';
            
            const screenCell = document.createElement('td');
            screenCell.textContent = visitor.screenSize || 'Unknown';
            
            row.appendChild(idCell);
            row.appendChild(dateCell);
            row.appendChild(visitsCell);
            row.appendChild(browserCell);
            row.appendChild(deviceCell);
            row.appendChild(screenCell);
            
            visitorsTableBody.appendChild(row);
        });
    }
    
    /**
     * Populate the contact logs table with data
     */
    function populateContactLogsTable(contactLogs) {
        if (!contactLogsTableBody) return;
        contactLogsTableBody.innerHTML = '';
        
        if (!contactLogs || contactLogs.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.textContent = 'No contact submissions available';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            contactLogsTableBody.appendChild(row);
            return;
        }
        
        const sortedLogs = [...contactLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        sortedLogs.forEach(log => {
            const row = document.createElement('tr');
            
            const idCell = document.createElement('td');
            idCell.textContent = log.id ? log.id.substring(0, 8) + '...' : 'N/A';
            
            const nameCell = document.createElement('td');
            nameCell.textContent = log.name || 'Unknown';
            
            const emailCell = document.createElement('td');
            emailCell.textContent = log.email || 'Unknown';
            
            const subjectCell = document.createElement('td');
            subjectCell.textContent = log.subject || 'Unknown';
            
            const messageCell = document.createElement('td');
            messageCell.textContent = log.message && log.message.length > 50 ? log.message.substring(0, 50) + '...' : log.message || 'N/A';
            messageCell.title = log.message || ''; // Full message on hover
            
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(log.timestamp);
            
            row.appendChild(idCell);
            row.appendChild(nameCell);
            row.appendChild(emailCell);
            row.appendChild(subjectCell);
            row.appendChild(messageCell);
            row.appendChild(dateCell);
            
            contactLogsTableBody.appendChild(row);
        });
    }
    
    /**
     * Update browser distribution stats
     */
    function updateBrowserStats(browserStats) {
        if (!browserStatsElement) return;
        browserStatsElement.innerHTML = '';
        
        if (!browserStats || browserStats.length === 0) {
            browserStatsElement.innerHTML = '<p>No browser data available</p>';
            return;
        }
        
        const total = browserStats.reduce((sum, stat) => sum + (stat.count || 0), 0);
        browserStats.forEach(stat => {
            const percentage = total > 0 ? Math.round((stat.count / total) * 100) : 0;
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            let iconClass = 'fas fa-globe';
            if (stat.browser === 'Chrome') iconClass = 'fab fa-chrome';
            else if (stat.browser === 'Firefox') iconClass = 'fab fa-firefox';
            else if (stat.browser === 'Safari') iconClass = 'fab fa-safari';
            else if (stat.browser === 'Edge') iconClass = 'fab fa-edge';
            else if (stat.browser === 'Opera') iconClass = 'fab fa-opera';
            else if (stat.browser === 'Internet Explorer') iconClass = 'fab fa-internet-explorer';
            statItem.innerHTML = `
                <div class="stat-name"><i class="${iconClass}"></i> ${stat.browser || 'Unknown'}</div>
                <div class="stat-value">${percentage}%</div>
                <div class="progress-container"><div class="progress-bar" style="width: ${percentage}%"></div></div>
            `;
            browserStatsElement.appendChild(statItem);
        });
    }
    
    /**
     * Update page popularity stats
     */
    function updatePageStats(pageStats) {
        if (!pageStatsElement) return;
        pageStatsElement.innerHTML = '';
        
        if (!pageStats || pageStats.length === 0) {
            pageStatsElement.innerHTML = '<p>No page data available</p>';
            return;
        }
        
        const total = pageStats.reduce((sum, stat) => sum + (stat.count || 0), 0);
        pageStats.forEach(stat => {
            const percentage = total > 0 ? Math.round((stat.count / total) * 100) : 0;
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            let pageName = stat.page === '/' ? 'Home' : stat.page ? stat.page.split('/').pop().split('.')[0] : 'Unknown';
            pageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
            statItem.innerHTML = `
                <div class="stat-name"><i class="fas fa-file"></i> ${pageName}</div>
                <div class="stat-value">${stat.count || 0} views</div>
                <div class="progress-container"><div class="progress-bar" style="width: ${percentage}%"></div></div>
            `;
            pageStatsElement.appendChild(statItem);
        });
    }
    
    /**
     * Helper functions for localStorage fallback
     */
    function computeBrowserStats(visitors) {
        const browserCounts = {};
        visitors.forEach(visitor => {
            const browser = visitor.browser || 'Unknown';
            browserCounts[browser] = (browserCounts[browser] || 0) + 1;
        });
        return Object.entries(browserCounts).map(([browser, count]) => ({ browser, count }));
    }

    function computePageStats(pageViews) {
        const pageCounts = {};
        pageViews.forEach(view => {
            const page = view.page || '/';
            pageCounts[page] = (pageCounts[page] || 0) + 1;
        });
        return Object.entries(pageCounts).map(([page, count]) => ({ page, count }));
    }

    function computeDeviceStats(visitors) {
        const deviceCounts = {};
        visitors.forEach(visitor => {
            const device = visitor.device || 'Unknown';
            deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        });
        return Object.entries(deviceCounts).map(([device, count]) => ({ device, count }));
    }

    function computeSessionBuckets(sessionDurations) {
        const buckets = {
            '< 1 min': 0,
            '1-3 min': 0,
            '3-5 min': 0,
            '5-10 min': 0,
            '> 10 min': 0
        };
        sessionDurations.forEach(duration => {
            if (!duration.duration) return;
            if (duration.duration < 60) buckets['< 1 min']++;
            else if (duration.duration < 180) buckets['1-3 min']++;
            else if (duration.duration < 300) buckets['3-5 min']++;
            else if (duration.duration < 600) buckets['5-10 min']++;
            else buckets['> 10 min']++;
        });
        return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
    }

    /**
     * Clean up old data
     */
    window.cleanupOldData = function() {
        fetch(`${API_BASE_URL}/admin/cleanup`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Old data cleaned up successfully');
                    updateStats();
                } else {
                    alert('Failed to clean up data');
                }
            })
            .catch(error => {
                console.error('Error cleaning up data:', error);
                alert('Error cleaning up data');
            });
    };
});
